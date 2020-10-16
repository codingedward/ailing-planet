#!/bin/sh
git checkout master

echo "Checking out to temporary directory ..."
echo
git branch -D deployment/temp 2>/dev/null
git checkout -b deployment/temp
echo

echo "Generating data and building assets ..."
echo
pushd src/data/
./generate.sh
popd
npm run production
echo

echo "Current directory is: "
pwd
echo "To deploy changes, we need to run 'rm -rf' on the current directory ..."
echo
echo "The following files will be deleted... "
ls -Al1 | grep -E -v "dist|CNAME|.git|node_modules"
echo
read -p "Continue(Y/y)? " -n 1 -r
echo 
if [[ $REPLY =~ ^[Yy]$ ]]
then
  ls -Al1 | grep -E -v "dist|CNAME|.git|node_modules" | xargs rm -rf
  echo "node_modules/" > .gitignore
fi

echo "Setting up deployment branch ..."
echo
cp -r ./dist/* .
rm -rf dist/
git add --all
git commit -m "New deployment"
git push origin deployment/temp:gh-pages -f
git checkout master
echo


echo "Cleaning up ..."
echo
git clean -f
git branch -D deployment/temp 2>/dev/null
echo
