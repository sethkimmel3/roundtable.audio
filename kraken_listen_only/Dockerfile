FROM golang:1.14

ENV GO111MODULE=on

WORKDIR $GOPATH/src/kraken

COPY go.mod go.sum ./
RUN cd $GOPATH/src/kraken && go mod download
  
COPY . $GOPATH/src/kraken

RUN cd $GOPATH/src/kraken && go build  

RUN cp config/engine.example.toml config/engine.toml

EXPOSE 7000

RUN ./kraken -c config/engine.toml -s engine


