(function() {
  Math.deg2Rad = deg => (deg * Math.PI) / 180;
  Math.rad2Deg = rad => (rad * 180) / Math.PI;
  Math.HALF_PI = Math.PI / 2;
  Math.QUARTER_PI = Math.PI / 4;
  Math.TAU = Math.PI * 2;
  const EPSILON = 1e-6;
  const EPSILON2 = 1e-12;
  const DATA_STEP = 3;
  const GLOBE_RADIUS = 200;
  const POINTS_GLOBE_RADIUS = GLOBE_RADIUS + 0.5;
  const PIXEL_RATIO = window.devicePixelRatio;
  const SKYBOX_TEXTURE = 'img/space';
  const WORLD_TEXTURE = 'img/world.jpg';
  const SHADERS = {
    earth: {
      uniforms: {
        worldTexture: { value: new THREE.TextureLoader().load(WORLD_TEXTURE) },
      },
      vertexShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        void main() {
          vUv = uv;
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec2 vUv;
        varying vec3 vNormal;
        uniform sampler2D worldTexture;
        void main() {
          vec3 diffuse = texture2D(worldTexture, vUv).rgb;
          float intensity = 1.05 - dot(vNormal, vec3(0.0, 0.0, 1.0));
          vec3 atmosphere = vec3(0.6, 0.0, 0.0) * pow(intensity, 1.5);
          gl_FragColor = vec4(diffuse + atmosphere, 1.0);
        }
      `,
    },
    atmosphere: {
      vertexShader: `
        varying vec3 vNormal;
        void main() {
          vNormal = normalize(normalMatrix * normal);
          gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vNormal;
        void main() {
          float intensity = pow(0.8 - dot(vNormal, vec3(0, 0, 0.85)), 15.0);
          gl_FragColor = vec4(0.6, 0.0, 0.0, 1.0) * intensity;
        }
      `,
    },
  };

  let scene;
  let earth;
  let camera;
  let renderer;
  let raycaster;
  let isOverRenderer;
  let points;
  let pointsMesh;
  let morphs;
  const zoomSpeed = 0;
  const mouse = { x: 0, y: 0 };
  const mouseOnDown = { x: 0, y: 0 };
  const rotation = { x: 5.6, y: 0.1 };
  const target = { x: 5.6, y: 0.1 };
  const targetOnDown = { x: 0, y: 0 };
  let distance = 1400;
  let distanceTarget = 1400;
  let isMouseMove;
  let mouseDownStartTime;
  const container = document.getElementsByClassName('container')[0];

  function initialize() {
    const WIDTH = window.innerWidth;
    const HEIGHT = window.innerHeight;

    raycaster = new THREE.Raycaster();
    window.scene = scene = new THREE.Scene();
    scene.background = new THREE.CubeTextureLoader().load(
      ['lf', 'rt', 'up', 'dn', 'ft', 'bk'].map(
        side => `${SKYBOX_TEXTURE}_${side}.png`,
      ),
    );

    const polygonMeshes = [];
    countries.features.forEach(({ geometry }) => {
      polygonMeshes.push(
        new THREE.LineSegments(
          new THREE.GeoJsonGeometry(geometry, GLOBE_RADIUS),
          new THREE.LineBasicMaterial({ color: '#440000' }),
        ),
      );
    });
    polygonMeshes.forEach(mesh => {
      mesh.rotation.y = 1.5 * Math.PI;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      scene.add(mesh);
    });

    const geometry = new THREE.SphereBufferGeometry(GLOBE_RADIUS, 40, 30);
    const earthMaterial = new THREE.ShaderMaterial(SHADERS.earth);
    earth = new THREE.Mesh(geometry, earthMaterial);
    earth.rotation.y = Math.PI;
    earth.matrixAutoUpdate = false;
    earth.updateMatrix();
    scene.add(earth);
    const atmosphereMaterial = new THREE.ShaderMaterial({
      ...SHADERS.atmosphere,
      side: THREE.BackSide,
      blending: THREE.AdditiveBlending,
      transparent: true,
    });
    const atmosphere = new THREE.Mesh(geometry, atmosphereMaterial);
    atmosphere.scale.set(1.08, 1.08, 1.08);
    atmosphere.matrixAutoUpdate = false;
    atmosphere.updateMatrix();
    scene.add(atmosphere);

    const pointsGeometry = new THREE.BoxGeometry(1.0, 1.0, 1.0);
    pointsGeometry.applyMatrix4(
      new THREE.Matrix4().makeTranslation(0, 0, -0.5),
    );
    pointsMesh = new THREE.Mesh(pointsGeometry);

    camera = new THREE.PerspectiveCamera(30, WIDTH / HEIGHT, 1, 10000);
    camera.position.z = distance;

    /*
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('bensound-relaxing.mp3', buffer => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.5);
      //sound.play();
    });
    */

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(WIDTH, HEIGHT);
    renderer.setPixelRatio(PIXEL_RATIO);
    renderer.domElement.style.position = 'absolute';
    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
    container.addEventListener('mousedown', onMouseDown, false);
    container.addEventListener('mousewheel', onMouseWheel, false);
    container.addEventListener(
      'mouseover',
      () => {
        isOverRenderer = true;
      },
      false,
    );
    container.addEventListener(
      'mouseout',
      () => {
        isOverRenderer = false;
      },
      false,
    );
  }

  // Borrowed from: https://github.com/d3/d3-geo/blob/master/src/polygonContains.js
  // -- changed to return GeoJSON's feature that contains *lngLat*
  function findCountryByLngLat(lngLat) {
    const point = [Math.deg2Rad(lngLat.lng), Math.deg2Rad(lngLat.lat)];
    const cartesian = spherical => {
      const lambda = spherical[0];
      const phi = spherical[1];
      const cosPhi = Math.cos(phi);
      return [
        cosPhi * Math.cos(lambda),
        cosPhi * Math.sin(lambda),
        Math.sin(phi),
      ];
    };
    const cartesianCross = (a, b) => {
      return [
        a[1] * b[2] - a[2] * b[1],
        a[2] * b[0] - a[0] * b[2],
        a[0] * b[1] - a[1] * b[0],
      ];
    };
    const cartesianNormalizeInPlace = d => {
      const l = Math.sqrt(d[0] * d[0] + d[1] * d[1] + d[2] * d[2]);
      (d[0] /= l), (d[1] /= l), (d[2] /= l);
    };
    const longitude = point => {
      if (Math.abs(point[0]) <= Math.PI) {
        return point[0];
      }
      return (
        Math.sign(point[0]) *
        (((Math.abs(point[0]) + Math.PI) % Math.TAU) - Math.PI)
      );
    };
    return countries.features.find(country => {
      const multiPolygonCoords =
        country.geometry.type === 'Polygon'
          ? [country.geometry.coordinates]
          : country.geometry.coordinates;
      const isWithinCountry = multiPolygonCoords.some(polygonCoords => {
        const polygon = polygonCoords.map(ring =>
          ring.map(p => [Math.deg2Rad(p[0]), Math.deg2Rad(p[1])]),
        );
        const lambda = longitude(point);
        let phi = point[1];
        const sinPhi = Math.sin(phi);
        const normal = [Math.sin(lambda), -Math.cos(lambda), 0];
        let angle = 0;
        let winding = 0;

        const sum = new d3.Adder();
        if (sinPhi === 1) {
           phi = Math.HALF_PI + EPSILON;
        } else if (sinPhi === -1) {
           phi = -Math.HALF_PI - EPSILON;
        }

        for (let i = 0, n = polygon.length; i < n; ++i) {
          let ring;
          let m;
          if (!(m = (ring = polygon[i]).length)) {
           continue;
          }
          let point0 = ring[m - 1];
          let lambda0 = longitude(point0);
          const phi0 = point0[1] / 2 + Math.QUARTER_PI;
          let sinPhi0 = Math.sin(phi0);
          let cosPhi0 = Math.cos(phi0);

          let lambda1;
          let point1;
          let sinPhi1;
          let cosPhi1;
          for (
            let j = 0;
            j < m;
            ++j,
              lambda0 = lambda1,
              sinPhi0 = sinPhi1,
              cosPhi0 = cosPhi1,
              point0 = point1
          ) {
            point1 = ring[j];
            lambda1 = longitude(point1);
            const phi1 = point1[1] / 2 + Math.QUARTER_PI;
            sinPhi1 = Math.sin(phi1);
            cosPhi1 = Math.cos(phi1);
            const delta = lambda1 - lambda0;
            const sign = delta >= 0 ? 1 : -1;
            const absDelta = sign * delta;
            const antimeridian = absDelta > Math.PI;
            const k = sinPhi0 * sinPhi1;

            sum.add(
              Math.atan2(
                k * sign * Math.sin(absDelta),
                cosPhi0 * cosPhi1 + k * Math.cos(absDelta),
              ),
            );
            angle += antimeridian ? delta + sign * Math.TAU : delta;

            // Are the longitudes either side of the point’s meridian (lambda),
            // and are the latitudes smaller than the parallel (phi)?
            if (antimeridian ^ (lambda0 >= lambda) ^ (lambda1 >= lambda)) {
              const arc = cartesianCross(cartesian(point0), cartesian(point1));
              cartesianNormalizeInPlace(arc);
              const intersection = cartesianCross(normal, arc);
              cartesianNormalizeInPlace(intersection);
              const phiArc =
                (antimeridian ^ (delta >= 0) ? -1 : 1) *
                Math.asin(intersection[2]);
              if (phi > phiArc || (phi === phiArc && (arc[0] || arc[1]))) {
                winding += antimeridian ^ (delta >= 0) ? 1 : -1;
              }
            }
          }
        }

        // First, determine whether the South pole is inside or outside:
        //
        // It is inside if:
        // * the polygon winds around it in a clockwise direction.
        // * the polygon does not (cumulatively) wind around it, but has a negative
        //   (counter-clockwise) area.
        //
        // Second, count the (signed) number of times a segment crosses a lambda
        // from the point to the South pole.  If it is zero, then the point is the
        // same side as the South pole.
        return (
          (angle < -EPSILON || (angle < EPSILON && sum < -EPSILON2)) ^
          (winding & 1)
        );
      });
      if (isWithinCountry) {
        return country;
      }
    });
  }

  function onCountryClicked(event) {
    const x =
      ((event.clientX - renderer.domElement.offsetLeft + 0.5) /
        window.innerWidth  * 2) - 1;
    const y =
      -(
        (event.clientY - renderer.domElement.offsetTop + 0.5) /
        window.innerHeight * 2
      ) + 1;
    raycaster.setFromCamera({ x, y }, camera);
    const intersects = raycaster.intersectObject(earth);
    if (intersects.length > 0) {
      const { point } = intersects[0];
      const lat = 90 - Math.rad2Deg(Math.acos(point.y / GLOBE_RADIUS));
      const lng =
        ((270 + Math.rad2Deg(Math.atan2(point.x, point.z))) % 360) - 180;
      const country = findCountryByLngLat({ lng, lat });
      if (country) {
        window.countryStats.setActiveCountry(country.properties);
      }
    }
  }

  function onMouseDown(event) {
    container.addEventListener('mousemove', onMouseMove, false);
    container.addEventListener('mouseup', onMouseUp, false);
    container.addEventListener('mouseout', onMouseOut, false);
    mouseOnDown.x = -event.clientX;
    mouseOnDown.y = event.clientY;
    targetOnDown.x = target.x;
    targetOnDown.y = target.y;
    mouseDownStartTime = performance.now();
    isMouseMove = false;
  }

  function onMouseMove(event) {
    isMouseMove = true;
    container.style.cursor = 'grabbing';
    const zoomDamp = distance / 800;
    mouse.x = -event.clientX;
    mouse.y = event.clientY;
    target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
    target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;
    target.y = Math.max(Math.min(Math.HALF_PI, target.y), -Math.HALF_PI);
  }

  function onMouseUp() {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
    container.style.cursor = 'auto';

    if (!isMouseMove && performance.now() - mouseDownStartTime <= 500) {
      onCountryClicked(event);
    }
  }

  function onMouseOut() {
    container.removeEventListener('mousemove', onMouseMove, false);
    container.removeEventListener('mouseup', onMouseUp, false);
    container.removeEventListener('mouseout', onMouseOut, false);
  }

  function onMouseWheel(event) {
    event.preventDefault();
    if (isOverRenderer) {
      zoom(event.wheelDeltaY * 0.3);
    }
    return false;
  }

  function onDocumentKeyDown(event) {
    switch (event.keyCode) {
      case 38:
        zoom(100);
        event.preventDefault();
        break;
      case 40:
        zoom(-100);
        event.preventDefault();
        break;
    }
  }

  function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  }

  function zoom(delta) {
    distanceTarget -= delta;
    distanceTarget = distanceTarget > 1500 ? 1500 : distanceTarget;
    distanceTarget = distanceTarget < 350 ? 350 : distanceTarget;
  }

  function render() {
    zoom(zoomSpeed);
    rotation.x += (target.x - rotation.x) * 0.1;
    rotation.y += (target.y - rotation.y) * 0.1;
    distance += (distanceTarget - distance) * 0.3;
    camera.position.x = distance * Math.sin(rotation.x) * Math.cos(rotation.y);
    camera.position.y = distance * Math.sin(rotation.y);
    camera.position.z = distance * Math.cos(rotation.x) * Math.cos(rotation.y);
    camera.lookAt(earth.position);
    renderer.render(scene, camera);
  }

  function animate() {
    target.x -= 0.0002;
    requestAnimationFrame(animate);
    render();
  }

  const globe = {
    initialize: () => {
      initialize();
    },
    run: () => {
      animate();
    },
    loadAnimationData: animationDataArrays => {
      const addAnimationFramePoints = ({
        dataArray,
        geometry,
        shouldUseMagnitude,
      }) => {
        for (let i = 0; i < dataArray.length; i += DATA_STEP) {
          const lat = dataArray[i];
          const lng = dataArray[i + 1];
          const magnitude = shouldUseMagnitude ? dataArray[i + 2] : 0;
          const phi = Math.deg2Rad(90 - lat);
          const theta = Math.deg2Rad(180 - lng);
          const radius = magnitude > 0 ? POINTS_GLOBE_RADIUS : 1;
          pointsMesh.position.x = radius * Math.sin(phi) * Math.cos(theta);
          pointsMesh.position.y = radius * Math.cos(phi);
          pointsMesh.position.z = radius * Math.sin(phi) * Math.sin(theta);
          pointsMesh.lookAt(earth.position);
          pointsMesh.scale.z = radius * magnitude;
          pointsMesh.updateMatrix();
          pointsMesh.geometry.faces.forEach(face => {
            face.color.setRGB(1, 0, 0);
          });
          geometry.merge(pointsMesh.geometry, pointsMesh.matrix);
        }
      };
      const basePointsGeometry = new THREE.Geometry();
      animationDataArrays.forEach((dataArray, dataArrayIndex) => {
        if (dataArrayIndex === 0) {
          addAnimationFramePoints({
            dataArray,
            geometry: basePointsGeometry,
            shouldUseMagnitude: false,
          });
        }
        const subGeometry = new THREE.Geometry();
        addAnimationFramePoints({
          dataArray,
          geometry: subGeometry,
          shouldUseMagnitude: true,
        });
        basePointsGeometry.morphTargets.push({
          name: dataArrayIndex.toString(),
          vertices: subGeometry.vertices,
        });
      });
      points = new THREE.Mesh(
        new THREE.BufferGeometry().fromGeometry(basePointsGeometry),
        new THREE.MeshBasicMaterial({
          vertexColors: THREE.FaceColors,
          morphTargets: true,
        }),
      );
      morphs = Object.keys(points.morphTargetDictionary);
      scene.add(points);
    },
    setTime: time => {
      morphs.forEach((_, morphIndex) => {
        points.morphTargetInfluences[morphs[morphIndex]] = 0;
      });
      const last = morphs.length - 1;
      const scaledTime = time * last + 1;
      const index = Math.min(Math.floor(scaledTime), last);
      const lastIndex = index - 1;
      const leftOver = scaledTime - index;
      if (lastIndex >= 0) {
        points.morphTargetInfluences[lastIndex] = 1 - leftOver;
      }
      points.morphTargetInfluences[index] = leftOver;
    },
  };

  window.globe = globe;
})();
