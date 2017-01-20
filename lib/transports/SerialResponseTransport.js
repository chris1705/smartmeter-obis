var SerialPort = require('serialport');

function SerialResponseTransport(options, protocol) {
    this.options = options;
    this.protocol = protocol;
    this.serialConnected = false;
    this.serialComm = undefined;

    this.requestTimer = null;
    this.currentData = "";
}

SerialResponseTransport.prototype.init = function init() {
    this.protocol.initState(); // init State from protocol instance

    if (!this.serialComm) {
        this.serialComm = new SerialPort(this.options.transportSerialPort, {autoOpen: false, baudrate: this.options.transportSerialBaudrate, databits: 8, stopbits:1, parity:'none', buffersize:2048});

        var self = this;
        this.serialComm.on("data", function (data) {
            self.currentData += data.toString('hex');
            if (self.protocol.checkMessage(self.currentData)) {
                this.pause();
                self.currentData = self.protocol.handleMessage(self.currentData);
                if (!self.protocol.isProcessComplete()) {
                    var messagesToSend = self.protocol.messagesToSend();
                    console.log("TO-SEND: " + messagesToSend);
                    for (var i = 0; i< messagesToSend; i++) {
                        var nextData = self.protocol.getNextMessage(this);
                        if (typeof nextData === 'string' || typeof nextData === 'object') {
                            if (nextData.length > 0) this.write(nextData);
                        }
                    }
                }
                if (self.protocol.isProcessComplete()) {
                    if (self.options.requestInterval===0) {
                        this.resume(); // we want to read continously
                    }
                    else {
                        this.close();
                        self.requestTimer = setTimeout(function() {
                            self.protocol.initState(); // reset Protocol instance because it will be a new session
                            self.process(); // and open port again
                        }, self.options.requestInterval*1000);
                    }
                }
                console.log(self.currentData);
            }
        });

        this.serialComm.on("error", function (msg) {
            console.log("error: " + msg);
            self.serialConnected = false;
            self.currentData = "";
        });

        this.serialComm.on("open", function () {
            console.log("OPEN");
            self.serialConnected = true;
            self.currentData = "";
        });

        this.serialComm.on("disconnect", function (err) {
            console.log("disconnect: " + err);
            self.serialConnected = false;
            self.currentData = "";
        });

        this.serialComm.on("close", function () {
            console.log("CLOSE");
            self.serialConnected = false;
            self.currentData = "";
        });

    }
    this.currentData = "";
};

SerialResponseTransport.prototype.process = function process() {
    this.serialComm.open();
};

module.exports = SerialResponseTransport;