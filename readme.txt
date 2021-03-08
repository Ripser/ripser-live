cd emsdk
git checkout master
git pull
./emsdk install latest
./emsdk activate latest

cd ..
make

python -m http.server 7380
open http://localhost:7380/?url=http://localhost:7380/ripser/examples/sphere_3_192.lower_distance_matrix&dim=3&threshold=1.75