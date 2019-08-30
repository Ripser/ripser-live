cd emsdk
git checkout master
git pull
./emsdk install latest
./emsdk activate latest

cd ..
make

python -m SimpleHTTPServer 8080
open http://localhost:8080/?url=https://live.ripser.org/ripser/examples/sphere_3_192.lower_distance_matrix&dim=2