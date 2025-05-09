build:
	go get .
	go generate
	go build -o ../bin/hammerspace-backend

run:
	make build
	../bin/hammerspace-backend --config ../config.yaml

prod:
	go get .
	go generate
	go build -o /usr/local/bin/hammerspace-backend
	sudo systemctl restart hammerspace-backend.service
	sleep 2s
	sudo systemctl status hammerspace-backend.service