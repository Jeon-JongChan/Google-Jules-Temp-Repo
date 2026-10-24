const { InterparkStrategy } = require('./strategies/InterparkStrategy');
const { NotImplementedStrategy } = require('./strategies/NotImplementedStrategy');

class StrategyFactory {
  static getStrategy(siteId, page, sendLog, config) {
    switch (siteId) {
      case 'interpark':
        return new InterparkStrategy(page, sendLog, config);
      case 'ticketlink':
        return new NotImplementedStrategy(page, sendLog, config, '티켓링크');
      case 'yes24':
        return new NotImplementedStrategy(page, sendLog, config, 'YES24 티켓');
      case 'melon':
        return new NotImplementedStrategy(page, sendLog, config, '멜론티켓');
      case 'sac':
        return new NotImplementedStrategy(page, sendLog, config, '예술의전당');
      case 'sejong':
        return new NotImplementedStrategy(page, sendLog, config, '세종문화회관');
      case 'ntok':
        return new NotImplementedStrategy(page, sendLog, config, '국립극장');
      case 'lgart':
        return new NotImplementedStrategy(page, sendLog, config, 'LG아트센터 서울');
      case 'lotte':
        return new NotImplementedStrategy(page, sendLog, config, '롯데콘서트홀');
      case 'livenation':
        return new NotImplementedStrategy(page, sendLog, config, '라이브네이션 코리아');
      case 'clubbalcony':
        return new NotImplementedStrategy(page, sendLog, config, '클럽발코니');
      case 'timeticket':
        return new NotImplementedStrategy(page, sendLog, config, '타임티켓');
      default:
        return new NotImplementedStrategy(page, sendLog, config, '알 수 없는 사이트');
    }
  }

  static detectSiteFromUrl(urlString) {
    try {
      const url = new URL(urlString);
      const hostname = url.hostname;

      // P2-1: 호스트네임 기반 정확한 판별
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
