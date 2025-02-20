build:
	go get .
	go generate
	go build -o ../bin/hammerspace-backend

run:
	make build
	../bin/hammerspace-backend --config ../config.yaml