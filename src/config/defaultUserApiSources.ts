export interface DefaultUserApiSource {
  id: string
  name: string
  url: string
}

export const DEFAULT_USER_API_SOURCES: DefaultUserApiSource[] = [
  {
    id: 'sixyin',
    name: 'SixYin',
    url: 'https://ghproxy.net/raw.githubusercontent.com/pdone/lx-music-source/main/sixyin/latest.js',
  },
  {
    id: 'huibq',
    name: 'HuiBQ',
    url: 'https://ghproxy.net/raw.githubusercontent.com/pdone/lx-music-source/main/huibq/latest.js',
  },
  {
    id: 'flower',
    name: 'Flower',
    url: 'https://ghproxy.net/raw.githubusercontent.com/pdone/lx-music-source/main/flower/latest.js',
  },
  {
    id: 'lx',
    name: 'LX',
    url: 'https://ghproxy.net/raw.githubusercontent.com/pdone/lx-music-source/main/lx/latest.js',
  },
  {
    id: 'ikun',
    name: 'IKun',
    url: 'https://ghproxy.net/raw.githubusercontent.com/pdone/lx-music-source/main/ikun/latest.js',
  },
  {
    id: 'grass',
    name: 'Grass',
    url: 'https://ghproxy.net/raw.githubusercontent.com/pdone/lx-music-source/main/grass/latest.js',
  },
  {
    id: 'juhe',
    name: 'Juhe',
    url: 'https://ghproxy.net/raw.githubusercontent.com/pdone/lx-music-source/main/juhe/latest.js',
  },
]
