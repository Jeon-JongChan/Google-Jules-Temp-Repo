const { InterparkStrategy } = require('./sites/InterparkStrategy');
const { TicketlinkStrategy } = require('./sites/TicketlinkStrategy');
const { Yes24Strategy } = require('./sites/Yes24Strategy');
const { MelonStrategy } = require('./sites/MelonStrategy');
const { SacStrategy } = require('./sites/SacStrategy');
const { SejongStrategy } = require('./sites/SejongStrategy');
const { NtokStrategy } = require('./sites/NtokStrategy');
const { LgartStrategy } = require('./sites/LgartStrategy');
const { LotteStrategy } = require('./sites/LotteStrategy');
const { LivenationStrategy } = require('./sites/LivenationStrategy');
const { TimeticketStrategy } = require('./sites/TimeticketStrategy');
const { NotImplementedStrategy } = require('./sites/NotImplementedStrategy');

class StrategyFactory {
  static getStrategy(siteId, page, sendLog, config) {
    switch (siteId) {
      case 'interpark': return new InterparkStrategy(page, sendLog, config);
      case 'ticketlink': return new TicketlinkStrategy(page, sendLog, config);
      case 'yes24': return new Yes24Strategy(page, sendLog, config);
      case 'melon': return new MelonStrategy(page, sendLog, config);
      case 'sac': return new SacStrategy(page, sendLog, config);
      case 'sejong': return new SejongStrategy(page, sendLog, config);
      case 'ntok': return new NtokStrategy(page, sendLog, config);
      case 'lgart': return new LgartStrategy(page, sendLog, config);
      case 'lotte': return new LotteStrategy(page, sendLog, config);
      case 'livenation': return new LivenationStrategy(page, sendLog, config);
      case 'timeticket': return new TimeticketStrategy(page, sendLog, config);
      default: return new NotImplementedStrategy(page, sendLog, config, '알 수 없는 사이트');
    }
  }

  static detectSiteFromUrl(urlString) {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname;

      const checkDomain = (domain) => hostname === domain || hostname.endsWith('.' + domain);

      if (checkDomain('interpark.com') || checkDomain('nol.yanolja.com')) return 'interpark';
      if (checkDomain('ticketlink.co.kr')) return 'ticketlink';
      if (checkDomain('yes24.com')) return 'yes24';
      if (checkDomain('melon.com')) return 'melon';
      if (checkDomain('sac.or.kr')) return 'sac';
      if (checkDomain('sejongpac.or.kr')) return 'sejong';
      if (checkDomain('ntok.go.kr')) return 'ntok';
      if (checkDomain('lgart.com')) return 'lgart';
      if (checkDomain('lotteconcerthall.com')) return 'lotte';
      if (checkDomain('livenation.kr')) return 'livenation';
      if (checkDomain('timeticket.co.kr')) return 'timeticket';

      return 'unknown';
    } catch(e) {
      return 'unknown';
    }
  }
}

module.exports = { StrategyFactory };
