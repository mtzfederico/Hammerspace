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

## Storage Setup
We are using [object (or blob storage)](https://en.wikipedia.org/wiki/Object_storage) with the S3 protocol from AWS to store the user's files. While S3 is from AWS, there are many AWS-compatible services such as [Cloudflare R2](https://www.cloudflare.com/developer-platform/products/r2/) which is cheaper.

object storage doesn't have a concept of directories and instead files are simply placed inside of a "bucket" and are given an Object ID which you later use to retrieve the file.

The actual directory structure that the user's are going to see is going to be stored in a database.

### How to connect to R2
1) Create an account on Cloudlfare
2) Go to the R2 tab on the left side
3) You might have to give them your credit card, they are only needed if you go past the free 10 GB and you'll be charged $0.015/GB.
4) Create a standard bucket in any location and write down your api keys
