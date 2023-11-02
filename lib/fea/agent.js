import HttpsAgent from './httpsAgent.js';
import HttpAgent from './httpAgent.js';
export default class Agent {
  constructor(options) {
    const httpOpt = {
      tunnel: false,
      ...options
    };
    this.http = new HttpAgent(httpOpt);
    const httpsOpt = {
      ...options,
      tunnel: true
    };
    this.https = new HttpsAgent(httpsOpt);
  }
}