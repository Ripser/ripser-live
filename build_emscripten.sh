source emsdk/emsdk_env.sh
emcc -s WASM=1 -s ALLOW_MEMORY_GROWTH=1 -s MAXIMUM_MEMORY=4GB -Wall --bind --memory-init-file 0 -std=c++11 -o ripser.js -O3 -D NDEBUG ripser/ripser.cpp
