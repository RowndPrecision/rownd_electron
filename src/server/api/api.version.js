import request from 'superagent';
import {
  ERR_INTERNAL_SERVER_ERROR
} from '../constants';
import pkg from '../../package.json';

const pkgName = 'cncjs';

export const getLatestVersion = (req, res) => {
  const url = 'https://rownd-electron-update-server.vercel.app/update/deb_arm64/' + pkg.version;

  console.log(pkg.version)
  request
    .get(url)
    .then((_res) => {
      const { body: data = {} } = { ..._res };
      console.log(data);
      res.send({ 
        time: data['pub_date'], 
        name: "Rownd", 
        version: data['name'] ?? pkg.version, 
        description: data['notes'], 
        homepage: "https://rownd-electron-update-server.vercel.app" 
      });
    })
    .catch((err) => {
      if (err) {
        res.status(ERR_INTERNAL_SERVER_ERROR).send({
          msg: `Failed to connect to ${url}: code=${err.code}`
        });
        return;
      }
    });;
};
