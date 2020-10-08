(function() {
  const debounce = (func, delay) => { 
    let debounceTimer ;
    return function() { 
      const context = this;
      const args = arguments;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => func.apply(context, args), delay) ;
    } 
  }; 

  Math.deg2Rad = deg => (deg * Math.PI) / 180;
  Math.rad2Deg = rad => (rad * 180) / Math.PI;
  Math.HALF_PI = Math.PI / 2;
  Math.QUARTER_PI = Math.PI / 4;
  Math.TAU = Math.PI * 2;

  const WIDTH = window.innerWidth;
  const HEIGHT = window.innerHeight;
  const EPSILON = 1e-6;
  const EPSILON2 = 1e-12;
  const DATA_STEP = 3;
  const GLOBE_RADIUS = 200;
  const POINTS_GLOBE_RADIUS = GLOBE_RADIUS + 0.5;
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
  let dataSetPoints = {};
  let point;
  let morphs;
  const zoomSpeed = 0;
  const mouse = { x: 0, y: 0 };
  const mouseOnDown = { x: 0, y: 0 };
  const rotation = { x: 0, y: 0.4 };
  const target = { x: -0.5, y: 0.2 };
  const targetOnDown = { x: 0, y: 0 };
  let distance = 1400;
  let distanceTarget = WIDTH > 1024 ? 1000 : 1400;
  let isPanning;
  let isAnimating;
  let pointsMaterial;
  let currentDataSetIndex;
  let focusedCountry = {
    clicked: { isoCode: null, name: '', mesh: null },
    hovered: { isoCode: null, name: '', mesh: null },
  };
  const container = document.getElementsByClassName('container')[0];
  const containerEvents = new Hammer(container);
  containerEvents.get('pinch').set({ enable: true });
  containerEvents.get('pan').set({ direction: Hammer.DIRECTION_ALL, threshold: 0 });

  function initialize() {
    raycaster = new THREE.Raycaster();
    window.scene = scene = new THREE.Scene();
    scene.background = new THREE.CubeTextureLoader().load(
      ['lf', 'rt', 'up', 'dn', 'ft', 'bk'].map(
        side => `${SKYBOX_TEXTURE}_${side}.png`,
      ),
    );

    const countryPolygons = new THREE.LineSegments(
      THREE.BufferGeometryUtils.mergeBufferGeometries(
        countries.features.map(
          country => new THREE.GeoJsonGeometry(country.geometry, GLOBE_RADIUS),
        ),
        false,
      ),
      new THREE.LineBasicMaterial({ color: '#440000' }),
    );
    countryPolygons.rotation.y = 1.5 * Math.PI;
    countryPolygons.matrixAutoUpdate = false;
    countryPolygons.updateMatrix();
    scene.add(countryPolygons);

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

    point = new THREE.Mesh(
      (new THREE.BoxBufferGeometry(1.0, 1.0, 1.5))
        .applyMatrix4(
          new THREE.Matrix4().makeTranslation(0, 0, -0.75),
      )
    );
    pointsMaterial = new THREE.MeshBasicMaterial({
      color: '#ff0000', 
      morphTargets: true 
    });

    camera = new THREE.PerspectiveCamera(30, WIDTH / HEIGHT, 1, 10000);
    camera.position.z = distance;

    /* This would add 5MBs to each request, so leaving out for now...
    const listener = new THREE.AudioListener();
    camera.add(listener);

    const sound = new THREE.Audio(listener);
    const audioLoader = new THREE.AudioLoader();
    audioLoader.load('bensound-relaxing.mp3', buffer => {
      sound.setBuffer(buffer);
      sound.setLoop(true);
      sound.setVolume(0.5);
      sound.play();
    });
    */

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(WIDTH, HEIGHT);
    renderer.domElement.style.position = 'absolute';
    container.appendChild(renderer.domElement);

    window.addEventListener('resize', onWindowResize, false);
    document.addEventListener('keydown', onDocumentKeyDown, false);
    containerEvents.on('panstart', onPanStart);
    containerEvents.on('panmove', onPanMove);
    containerEvents.on('tap', onTap);
    containerEvents.on('pinch pinchmove', onZoom);
    container.addEventListener('wheel', onZoom, false);
    container.addEventListener('mousemove', onMouseMove, false);
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

  function mapClientToWorldPoint(point) {
    const x =
      ((point.x - renderer.domElement.offsetLeft + 0.5) / window.innerWidth) *
        2 -
      1;
    const y =
      -(
        ((point.y - renderer.domElement.offsetTop + 0.5) / window.innerHeight) *
        2
      ) + 1;
    return { x, y };
  }

  function findCountryForWorldPoint(point) {
    raycaster.setFromCamera(point, camera);
    const intersects = raycaster.intersectObject(earth);
    if (intersects.length > 0) {
      const { point } = intersects[0];
      const lat = 90 - Math.rad2Deg(Math.acos(point.y / GLOBE_RADIUS));
      const lng =
        ((270 + Math.rad2Deg(Math.atan2(point.x, point.z))) % 360) - 180;
      return findCountryByLngLat({ lng, lat });
    }
  }

  function setFocusOnCountry({ country, scope, color }) {
    if (
      country &&
      country.properties.isoCode !== focusedCountry[scope].isoCode
    ) {
      if (focusedCountry[scope].mesh) {
        scene.remove(focusedCountry[scope].mesh);
        focusedCountry[scope].mesh.geometry.dispose();
        focusedCountry[scope].mesh.material.dispose();
      }
      const mesh = new THREE.LineSegments(
        new THREE.GeoJsonGeometry(country.geometry, GLOBE_RADIUS + 0.5),
        new THREE.LineBasicMaterial({ color }),
      );
      mesh.rotation.y = 1.5 * Math.PI;
      mesh.matrixAutoUpdate = false;
      mesh.updateMatrix();
      focusedCountry = {
        ...focusedCountry,
        [scope]: {
          mesh,
          name: country.properties.name,
          isoCode: country.properties.isoCode,
        },
      };
      scene.add(mesh);
    } else if (!country && focusedCountry[scope].mesh) {
      scene.remove(focusedCountry[scope].mesh);
      focusedCountry[scope].mesh.geometry.dispose();
      focusedCountry[scope].mesh.material.dispose();
      focusedCountry = {
        ...focusedCountry,
        [scope]: { mesh: null, isoCode: null, name: '' },
      };
    }
    if (country || (scope === 'hovered' && focusedCountry.clicked.mesh)) {
      stats.setActiveCountry(focusedCountry[country ? scope : 'clicked']);
    } else {
      stats.setActiveCountry(null);
    }
  }

  function onCountryClicked(point) {
    const country = findCountryForWorldPoint(
      mapClientToWorldPoint(point),
    );
    setFocusOnCountry({ country, scope: 'clicked', color: '#ff0000' });
  }


  const onCountryHovered = debounce(
    point => {
      const country = findCountryForWorldPoint(
        mapClientToWorldPoint(point),
      );
      setFocusOnCountry({ country, scope: 'hovered', color: '#aa0000' });
    },
    1
  );

  function onPanStart(event) {
    containerEvents.on('panend', onPanEnd);
    mouseOnDown.x = -event.center.x;
    mouseOnDown.y = event.center.y;
    targetOnDown.x = target.x;
    targetOnDown.y = target.y;
    isPanning = true;
  }

  function onPanMove(event) {
    container.style.cursor = 'grabbing';
    const zoomDamp = distance / 800;
    mouse.x = -event.center.x;
    mouse.y = event.center.y;
    target.x = targetOnDown.x + (mouse.x - mouseOnDown.x) * 0.005 * zoomDamp;
    target.y = targetOnDown.y + (mouse.y - mouseOnDown.y) * 0.005 * zoomDamp;
    target.y = Math.max(Math.min(Math.HALF_PI, target.y), -Math.HALF_PI);
  }

  function onMouseMove(event) {
    if (!isPanning) {
      onCountryHovered({
        x: event.clientX,
        y: event.clientY,
      });
    }
  }

  function onPanEnd() {
    isPanning = false;
    containerEvents.off('panend', onPanEnd);
    container.style.cursor = 'auto';
  }

  function onTap(event) {
    onCountryClicked(event.center);
  }

  function onZoom(event) {
    zoom(event.deltaY > 0 ? -120 : 120);
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
    distanceTarget = distanceTarget > 1600 ? 1600 : distanceTarget;
    distanceTarget = distanceTarget < 600 ? 600 : distanceTarget;
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
    if (window.isAnimationPlaying) {
      target.x -= 0.0002;
    }
    requestAnimationFrame(animate);
    render();
  }

  function createGeometryFromData ({ dataArray, shouldUseMagnitude }) {
    const geometries = [];
    for (let i = 0; i < dataArray.length; i += DATA_STEP) {
      const lat = dataArray[i];
      const lng = dataArray[i + 1];
      const magnitude = shouldUseMagnitude ? dataArray[i + 2] : 0;
      const phi = Math.deg2Rad(90 - lat);
      const theta = Math.deg2Rad(180 - lng);
      const radius = magnitude > 0 ? POINTS_GLOBE_RADIUS : 1;
      point.position.x = radius * Math.sin(phi) * Math.cos(theta);
      point.position.y = radius * Math.cos(phi);
      point.position.z = radius * Math.sin(phi) * Math.sin(theta);
      point.lookAt(earth.position);
      point.scale.z = radius * magnitude;
      point.updateMatrix();
      geometries.push(point.geometry.clone().applyMatrix4(point.matrix));
    }
    return THREE.BufferGeometryUtils.mergeBufferGeometries(geometries);
  };

  function loadAnimationData({ globeData, dataSetKey }) {
    const geometry = createGeometryFromData({
      dataArray: globeData[0],
      shouldUseMagnitude: false,
    });
    geometry.morphAttributes.position = [];
    globeData.forEach((dataArray, index) => {
      geometry.morphAttributes.position[index] =
        createGeometryFromData({
          dataArray,
          shouldUseMagnitude: true,
        }).attributes.position;
    });
    delete globeData;
    dataSetPoints[dataSetKey] = new THREE.Mesh(geometry, pointsMaterial);
  }

  function setActiveDataSet(dataIndex) {
    if (dataIndex === currentDataSetIndex) {
      return;
    }
    scene.remove(dataSetPoints[currentDataSetIndex]);
    scene.add(dataSetPoints[dataIndex])
    morphs = Object.keys(dataSetPoints[dataIndex].morphTargetDictionary);
    currentDataSetIndex = dataIndex;

    if (!isAnimating) {
      isAnimating = true;
      animate();
    }
  }

  const globe = {
    initialize,
    loadAnimationData,
    setActiveDataSet,
    setTime: time => {
      const points = dataSetPoints[currentDataSetIndex];
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

