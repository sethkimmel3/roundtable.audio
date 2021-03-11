FROM golang:1.14

ENV GO111MODULE=on

WORKDIR $GOPATH/src/kraken

COPY go.mod go.sum ./
RUN cd $GOPATH/src/kraken && go mod download
  
COPY . $GOPATH/src/kraken

RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o /build .

FROM alpine:3.12.1

RUN apk --no-cache add ca-certificates
COPY --from=0 /build /usr/local/bin/build

COPY config/engine.example.toml /config/engine.toml

EXPOSE 7000

ENTRYPOINT ["/usr/local/bin/build"]
CMD ["-c", "/config/engine.toml", "-s", "engine"]
