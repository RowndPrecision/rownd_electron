import { spawn } from 'child_process';

export const runProcess = (req, res) => {
  const scriptPath = '../scripts/btScan.py';
  const process = spawn('python3', [scriptPath]);
  console.log(process);

  process.stdout.on('data', (data) => {
    console.log('başladıııı');
    if (data.includes('Successfully connected to device')) {
      res.send({ bleconnected: true });
    }
  });
  // this.process.stderr.on('data', this.eventListener.processError);
  // this.process.stderr.on('close', this.eventListener.processClose);

  // res.send({});
};


export const removeAllDevices = (req, res) => {
  res.send({});
};


export const scanAndPair = (req, res) => {
  res.send({});
};


export const killProcess = (req, res) => {
  res.send({});
};
