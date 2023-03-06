
_________________________________________________
# Tải các gói phụ thuộc:
- git | https://git-scm.com/downloads
- docker | https://www.docker.com/products/docker-desktop
- go | https://go.dev/dl
- jq | https://stedolan.github.io/jq/download
- nodejs | https://nodejs.org/en/download
- http-serve | https://www.npmjs.com/package/http-serve

__________________________________________________
# Cấu hình
Ở thư mục gốc của code chạy các lệnh sau:

- install image docker 
$ ./install-fabric.sh d s

- create binary 
$ ./install-fabric.sh binary

__________________________________________________
# Chạy network
Di chuyển vào thư mục fabric-samples/test-network

- Tạo các tổ chức và các kênh
$ ./network.sh up createChannel -c mychannel -ca

- Deploy the smart contract
$ ./network.sh deployCC -ccn basic -ccp ../asset-transfer-basic/chaincode-typescript -ccl typescript

__________________________________________________
# Chạy server
Di chuyển vào thư mục fabric-samples/asset-transfer-basic/application-gateway-typescript

- tải các gói phụ thuộc 
$ npm install

- Build code 
$ npm run build 

- chạy server1
$ npm run start1

- chạy server2
$ npm run start2

__________________________________________________
# Chạy client 
Di chuyển vào thư mục client 

- chạy client1
$ http-serve -p 8081

- chạy client2
$ http-serve -p 8082