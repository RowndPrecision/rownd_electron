import { exec } from 'child_process';

export const runProcess = (req, res) => {
  const command = 'blueman-manager';
  exec(command, (err, stdout, stderr) => {
    if (err) {
      // Bir hata olursa, burada ele alın.
      console.error('Bir hata meydana geldi:', err);
      return;
    }

    // Komut başarıyla çalıştıysa çıktıyı loglayabilirsiniz (genellikle boş olacaktır)
    console.log(stdout);
  });
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
