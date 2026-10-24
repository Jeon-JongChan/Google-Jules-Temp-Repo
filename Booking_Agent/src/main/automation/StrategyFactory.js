const { InterparkStrategy } = require('./strategies/InterparkStrategy');
const { TicketlinkStrategy } = require('./strategies/TicketlinkStrategy');
const { Yes24Strategy } = require('./strategies/Yes24Strategy');
const { MelonStrategy } = require('./strategies/MelonStrategy');
const { SacStrategy } = require('./strategies/SacStrategy');
const { SejongStrategy } = require('./strategies/SejongStrategy');
const { NtokStrategy } = require('./strategies/NtokStrategy');
const { LgartStrategy } = require('./strategies/LgartStrategy');
const { LotteStrategy } = require('./strategies/LotteStrategy');
const { LivenationStrategy } = require('./strategies/LivenationStrategy');
const { ClubbalconyStrategy } = require('./strategies/ClubbalconyStrategy');
const { TimeticketStrategy } = require('./strategies/TimeticketStrategy');
const { NotImplementedStrategy } = require('./strategies/NotImplementedStrategy');

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
      case 'clubbalcony': return new ClubbalconyStrategy(page, sendLog, config);
      case 'timeticket': return new TimeticketStrategy(page, sendLog, config);
      default: return new NotImplementedStrategy(page, sendLog, config, '알 수 없는 사이트');
    }
  }

  static detectSiteFromUrl(urlString) {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname;

      if (hostname.endsWith('interpark.com')) return 'interpark';
      if (hostname.endsWith('ticketlink.co.kr')) return 'ticketlink';
      if (hostname.endsWith('yes24.com')) return 'yes24';
      if (hostname.endsWith('melon.com')) return 'melon';
      if (hostname.endsWith('sac.or.kr')) return 'sac';
      if (hostname.endsWith('sejongpac.or.kr')) return 'sejong';
      if (hostname.endsWith('ntok.go.kr')) return 'ntok';
      if (hostname.endsWith('lgart.com')) return 'lgart';
      if (hostname.endsWith('lotteconcerthall.com')) return 'lotte';
      if (hostname.endsWith('livenation.kr')) return 'livenation';
      if (hostname.endsWith('clubbalcony.com')) return 'clubbalcony';
      if (hostname.endsWith('timeticket.co.kr')) return 'timeticket';

      return 'unknown';
    } catch(e) {
      return 'unknown';
    }
  }
}

module.exports = { StrategyFactory };
