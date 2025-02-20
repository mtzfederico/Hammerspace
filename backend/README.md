# Backend
The backend is written in Go

## Build instructions
1) [Install Go](https://go.dev/doc/install)
2) On the terminal go to the backend folder
3) Copy the file `example-config.yaml` file to the root of the backend directory with the name `config.yaml` (i.e. the directory below src and bin) and modify it with your data.
4) To run the server, run the command `make run`. Note, you have to be in the `src` directory to run `make` commands.
    * To only build the binary run the command `make build`. The binary will be in the bin folder.

## DB Design
Look at db.sql file