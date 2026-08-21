const superRecommendations = [
  {
    key: 'jiuzhaigou', group: 'world', category: '自然', title: '九寨沟', region: '中国 · 四川阿坝',
    address: '九寨沟风景名胜区', latitude: 33.2603, longitude: 103.9186,
    description: '彩林、瀑布和高山海子层层展开，四季都能看到不同的水色。',
    reason: '第一次去优先走日则沟，秋季层次尤其丰富。', best_time: '9-10月', tags: ['国内', '自然', '摄影'],
    query: 'Jiuzhaigou Valley China landscape'
  },
  {
    key: 'zhangjiajie', group: 'world', category: '自然', title: '张家界武陵源', region: '中国 · 湖南张家界',
    address: '武陵源风景名胜区', latitude: 29.3549, longitude: 110.4774,
    description: '石英砂岩峰林在云雾里拔地而起，步道、峡谷和天然石桥很有辨识度。',
    reason: '适合安排两到三天，避开赶路式打卡。', best_time: '4-6月、9-11月', tags: ['国内', '峰林', '徒步'],
    query: 'Wulingyuan Zhangjiajie China sandstone pillars'
  },
  {
    key: 'huangshan', group: 'world', category: '自然', title: '黄山', region: '中国 · 安徽黄山',
    address: '黄山风景区', latitude: 30.1328, longitude: 118.1655,
    description: '奇松、怪石与云海构成经典山水，天气变化本身就是旅行的一部分。',
    reason: '住一晚更从容，也更容易遇到日出和云海。', best_time: '春秋两季', tags: ['国内', '山岳', '日出'],
    query: 'Mount Huangshan China sea of clouds'
  },
  {
    key: 'forbidden-city', group: 'world', category: '人文', title: '故宫博物院', region: '中国 · 北京',
    address: '东城区景山前街4号', latitude: 39.9163, longitude: 116.3972,
    description: '沿中轴线看宫殿秩序，再走东西六宫寻找更细腻的建筑与器物。',
    reason: '提前预约，给珍宝馆和钟表馆留出时间。', best_time: '春秋工作日', tags: ['国内', '建筑', '博物馆'],
    query: 'Forbidden City Beijing palace courtyard'
  },
  {
    key: 'li-river', group: 'world', category: '自然', title: '桂林漓江', region: '中国 · 广西桂林',
    address: '漓江桂林至阳朔段', latitude: 25.1903, longitude: 110.4315,
    description: '喀斯特峰丛沿水路舒展，从桂林到阳朔是一幅不断变化的长卷。',
    reason: '水上看全景，阳朔骑行补上田园细节。', best_time: '4-10月', tags: ['国内', '山水', '游船'],
    query: 'Li River Guilin Yangshuo China landscape'
  },
  {
    key: 'santorini-oia', group: 'world', category: '海岛', title: '圣托里尼伊亚', region: '希腊 · 圣托里尼',
    address: 'Oia, Santorini', latitude: 36.4618, longitude: 25.3753,
    description: '白色屋舍与蓝顶教堂贴着火山海湾铺开，傍晚光线最有层次。',
    reason: '日落前先走到小巷深处，避开最拥挤的观景台。', best_time: '5-6月、9-10月', tags: ['国外', '海岛', '日落'],
    query: 'Oia Santorini Greece blue domes sunset'
  },
  {
    key: 'rome-colosseum', group: 'world', category: '人文', title: '罗马斗兽场', region: '意大利 · 罗马',
    address: 'Piazza del Colosseo, Rome', latitude: 41.8902, longitude: 12.4922,
    description: '古罗马建筑尺度与城市日常在这里直接相遇，周边遗址值得连成一条步行线。',
    reason: '联票串起古罗马广场和帕拉蒂尼山更完整。', best_time: '4-6月、9-10月', tags: ['国外', '古迹', '城市漫步'],
    query: 'Colosseum Rome Italy exterior daylight'
  },
  {
    key: 'fushimi-inari', group: 'world', category: '人文', title: '伏见稻荷大社', region: '日本 · 京都',
    address: 'Fushimi Inari Taisha, Kyoto', latitude: 34.9671, longitude: 135.7727,
    description: '朱红色千本鸟居沿稻荷山延伸，越往山上走越能感到安静。',
    reason: '清晨抵达，光线和步行体验都会更舒服。', best_time: '全年清晨', tags: ['国外', '神社', '徒步'],
    query: 'Fushimi Inari Taisha Kyoto torii path'
  },
  {
    key: 'jungfraujoch', group: 'world', category: '自然', title: '少女峰地区', region: '瑞士 · 伯尔尼高地',
    address: 'Jungfraujoch, Switzerland', latitude: 46.5475, longitude: 7.9853,
    description: '雪峰、冰川、齿轨列车和山谷村庄组成非常完整的阿尔卑斯体验。',
    reason: '先看实时天气，再决定是否登顶，晴天体验差别很大。', best_time: '6-9月', tags: ['国外', '雪山', '火车'],
    query: 'Jungfrau Switzerland mountain railway landscape'
  },
  {
    key: 'milford-sound', group: 'world', category: '自然', title: '米尔福德峡湾', region: '新西兰 · 南岛',
    address: 'Milford Sound, Fiordland', latitude: -44.6414, longitude: 167.8974,
    description: '陡峭山体从深色水面升起，雨后瀑布密集，是峡湾国家公园的代表景观。',
    reason: '阴雨并不是坏天气，瀑布反而更有气势。', best_time: '11月-次年4月', tags: ['国外', '峡湾', '游船'],
    query: 'Milford Sound New Zealand Mitre Peak landscape'
  },
  {
    key: 'chengdu-panda-base', group: 'chengdu', category: '玩', title: '成都大熊猫繁育研究基地', region: '成都 · 成华区',
    address: '熊猫大道1375号', latitude: 30.7384, longitude: 104.1417,
    description: '看大熊猫和幼崽最稳妥的地方，园区较大，适合留出半天。',
    reason: '早上开园就到，熊猫更活跃，步行也更凉快。', best_time: '7:30-10:30', tags: ['成都', '熊猫', '亲子'],
    query: 'Chengdu Research Base Giant Panda China'
  },
  {
    key: 'chengdu-wuhou-shrine', group: 'chengdu', category: '玩', title: '成都武侯祠', region: '成都 · 武侯区',
    address: '武侯祠大街231号', latitude: 30.6451, longitude: 104.0495,
    description: '三国文化、红墙竹影和园林空间集中在一起，适合慢慢走。',
    reason: '和锦里相邻，但先看武侯祠再逛街更从容。', best_time: '上午或傍晚', tags: ['成都', '三国', '园林'],
    query: 'Wuhou Shrine Chengdu red wall bamboo'
  },
  {
    key: 'chengdu-dufu-cottage', group: 'chengdu', category: '玩', title: '杜甫草堂', region: '成都 · 青羊区',
    address: '青华路37号', latitude: 30.6630, longitude: 104.0289,
    description: '竹林、水榭和诗歌展陈让这里保持了成都少见的安静节奏。',
    reason: '雨后园林很舒服，适合和浣花溪一起散步。', best_time: '春秋下午', tags: ['成都', '诗歌', '园林'],
    query: 'Du Fu Thatched Cottage Chengdu garden'
  },
  {
    key: 'chengdu-museum', group: 'chengdu', category: '玩', title: '成都博物馆', region: '成都 · 青羊区',
    address: '小河街1号', latitude: 30.6583, longitude: 104.0636,
    description: '从古代成都到近现代民俗，常设展很适合系统认识这座城市。',
    reason: '室内体验稳定，炎热或下雨天尤其合适。', best_time: '工作日上午', tags: ['成都', '博物馆', '室内'],
    query: 'Chengdu Museum Tianfu Square building'
  },
  {
    key: 'chengdu-kuanzhai', group: 'chengdu', category: '逛', title: '宽窄巷子', region: '成都 · 青羊区',
    address: '长顺上街127号', latitude: 30.6695, longitude: 104.0565,
    description: '老街院落、茶馆和小店密集，适合第一次来成都感受城市肌理。',
    reason: '从井巷子进入，早晚比正午更适合拍照和散步。', best_time: '上午或夜间', tags: ['成都', '街区', '夜游'],
    query: 'Kuanzhai Alley Chengdu China street'
  },
  {
    key: 'chengdu-heming-teahouse', group: 'chengdu', category: '喝', title: '人民公园鹤鸣茶社', region: '成都 · 青羊区',
    address: '少城路12号人民公园内', latitude: 30.6577, longitude: 104.0557,
    description: '竹椅、盖碗茶和公园树荫，是观察成都慢生活最直接的一站。',
    reason: '点一杯茶坐久一点，比匆匆拍照更有意思。', best_time: '工作日下午', tags: ['成都', '盖碗茶', '公园'],
    query: 'People Park Chengdu teahouse tea'
  },
  {
    key: 'chengdu-jianshe-road', group: 'chengdu', category: '吃', title: '建设路小吃街', region: '成都 · 成华区',
    address: '建设巷及建设路片区', latitude: 30.6725, longitude: 104.1005,
    description: '成都小吃选择密集，适合多人分着吃，一次尝到更多口味。',
    reason: '先少量多样，再决定返场哪一家，避开重复排队。', best_time: '17:00后', tags: ['成都', '小吃', '夜宵'],
    query: 'Chengdu street food night market China'
  },
  {
    key: 'chengdu-kuixinglou', group: 'chengdu', category: '吃', title: '奎星楼街', region: '成都 · 青羊区',
    address: '奎星楼街', latitude: 30.6719, longitude: 104.0536,
    description: '川味餐馆与新派小店并存，离宽窄巷子不远但更偏向本地吃饭场景。',
    reason: '适合把正餐和饭后散步排在一起。', best_time: '午餐或晚餐', tags: ['成都', '川菜', '朋友聚餐'],
    query: 'Kuixinglou Street Chengdu food'
  },
  {
    key: 'chengdu-wangping-street', group: 'chengdu', category: '逛', title: '望平街与香香巷', region: '成都 · 锦江区',
    address: '望平街滨河路段', latitude: 30.6547, longitude: 104.0930,
    description: '沿锦江的餐饮、咖啡与夜景连成轻松的城市散步路线。',
    reason: '傍晚从河边走到夜间，吃喝和拍照可以一次完成。', best_time: '傍晚至夜间', tags: ['成都', '夜景', '咖啡'],
    query: 'Wangping Street Chengdu Jinjiang river night'
  },
  {
    key: 'chengdu-eastern-memory', group: 'chengdu', category: '玩', title: '东郊记忆', region: '成都 · 成华区',
    address: '建设南支路4号', latitude: 30.6719, longitude: 104.1209,
    description: '工业遗存、展演空间与创意店铺混合，拍照、看展和听现场都方便。',
    reason: '先查看当天展演信息，周末傍晚氛围更完整。', best_time: '周末下午至夜间', tags: ['成都', '展览', '音乐'],
    query: 'Eastern Suburb Memory Chengdu industrial park'
  }
].map(item => ({ ...item, image_path: `/assets/super-recommendations/${item.key}.jpg` }));

module.exports = { superRecommendations };
