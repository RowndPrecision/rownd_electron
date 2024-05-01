const bleno = require('bleno');
const fs = require('fs');
const path = require('path');
const { Buffer } = require('buffer');

class WriteCharacteristic extends bleno.Characteristic {
  constructor(uuid) {
    super({
      uuid,
      properties: ['write', 'write-without-response'],
    });

    this.fileData = Buffer.alloc(0);
    this.receivedFileName = '';
    this.filesFolderPath = path.join(__dirname, '..', 'files');
    this.expectedChunks = 0;
    this.receivedChunks = 0;
  }

  onWriteRequest(data, offset, withoutResponse, callback) {
    console.log(data);
    const headerEndIndex = data.indexOf('\n');
    if (headerEndIndex !== -1) {
      const header = JSON.parse(data.slice(0, headerEndIndex).toString());

      if (header.type === 'coordinates') {
        const coordinates = JSON.parse(
          data.slice(headerEndIndex + 1).toString(),
        );
        //process.send(coordinates);
        console.log(coordinates);

        if (!withoutResponse) {
          callback(this.RESULT_SUCCESS);
        }

        return;
      }

      if (header.type === 'file') {
        if (this.receivedChunks === 0) {
          this.receivedFileName = header.fileName;
          this.expectedChunks = header.total;
          console.log(
            `Receiving "${this.receivedFileName}" in ${this.expectedChunks} chunks.`,
          );
        } else {
          console.log(
            `Received chunk ${this.receivedChunks}: size ${data.length}`,
          );
          this.fileData = Buffer.concat([
            this.fileData,
            data.slice(headerEndIndex + 1),
          ]);
        }

        // Acknowledge the write request.
        if (!withoutResponse) {
          callback(this.RESULT_SUCCESS);
        }

        // Increment the received chunks counter.
        this.receivedChunks++;

        // Check if all chunks are received.
        if (this.receivedChunks === this.expectedChunks) {
          // Concatenate all parts to create the final buffer.

          if (!fs.existsSync(this.filesFolderPath)) {
            fs.mkdirSync(this.filesFolderPath, { recursive: true });
          }

          const savePath = path.join(
            this.filesFolderPath,
            this.receivedFileName,
          );

          // Write the buffer to a file.
          fs.writeFile(savePath, this.fileData, (err) => {
            if (err) {
              console.error(`Error writing file "${savePath}":`, err);
            } else {
              console.log(
                `File "${savePath}" received and saved successfully.`,
              );
              //process.send({ filePath: savePath });
            }
          });

          // Reset state after file save.
          this.receivedFileName = '';
          this.fileData = Buffer.alloc(0);
          this.receivedChunks = 0;
          this.expectedChunks = 0;
        }
      }
    }
  }
}
module.exports = WriteCharacteristic;