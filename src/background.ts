import browser from 'webextension-polyfill';

const singleDefault = 'nijie/${userName}(${userId})/${title}(${id})';
const multiDefault = 'nijie/${userName}(${userId})/${title}(${id})/${page}';

interface Info {
  urls: string[];
  title: string;
  illustId: string;
  userId: string;
  userName: string;
  postDate: string;
}

// ダウンロード中のアイテムのID
const downloadingIds: number[] = [];
let tabId: number | undefined;

/**
 * 保存ファイル名用連番数字幅を計算する
 *
 * 例：
 * 全部で9枚→1桁(1 - 9)
 * 全部で10枚→2桁(01 - 10)
 * @param length 画像ファイルリストの長さ
 */
const calcDigits = (length: number): number => {
  return length.toString().length;
};

/**
 * 保存先パスを取得する
 * @param pathElems 保存先パスの設定
 */
const getSavePath = (pathElems: string[], info: Info): string[] => {
  const date = new Date(info.postDate);

  return pathElems.map((pathElem) => {
    pathElem = pathElem.replace('${id}', esc(info.illustId));
    pathElem = pathElem.replace('${title}', esc(info.title));
    pathElem = pathElem.replace('${userId}', esc(info.userId));
    pathElem = pathElem.replace('${userName}', esc(info.userName));
    pathElem = pathElem.replace('${YYYY}', esc(date.getFullYear().toString()));
    pathElem = pathElem.replace(
      '${MM}',
      esc((date.getMonth() + 1).toString().padStart(2, '0')),
    );
    pathElem = pathElem.replace(
      '${DD}',
      esc(date.getDate().toString().padStart(2, '0')),
    );
    pathElem = pathElem.replace(
      '${hh}',
      esc(date.getHours().toString().padStart(2, '0')),
    );
    pathElem = pathElem.replace(
      '${mm}',
      esc(date.getMinutes().toString().padStart(2, '0')),
    );
    pathElem = pathElem.replace(
      '${ss}',
      esc(date.getSeconds().toString().padStart(2, '0')),
    );
    return pathElem;
  });
};

/**
 * ページ数を返す
 * @param digits 連番数字幅
 * @param index 添字
 */
const getPageNumber = (digits: number, index: number): string => {
  return index.toString().padStart(digits, '0');
};

/**
 * 保存ファイル名を取得する
 */
const getSaveFileName = (
  setting: string,
  url: string,
  digits: number,
  index: number,
): string => {
  const extension = url.substring(url.lastIndexOf('.'));
  setting = setting
    .replace('${page}', getPageNumber(digits, index))
    .replace('${padPage}', getPageNumber(3, index))
  return setting + extension;
};

/**
 * ファイル名に使えない文字を置換する
 *
 * usable: +-=[]{}@`;_.,&%$#!^
 * unusable: \/:*?"<>|~
 * Unusable chars are not depending on os.
 */
const esc = (str: string): string => {
  return str.replace(/[\\/:*?"<>|~]/g, '_');
};

/**
 * 保存先パス設定を返す
 *
 * @param isSingle 複数枚かどうか
 */
const getSaveFilePathSetting = async (isSingle: boolean): Promise<string> => {
  const setting = await browser.storage.sync.get(['single', 'multi']);
  const single = setting.single || singleDefault;
  const multi = setting.multi || multiDefault;
  return isSingle ? single : multi;
};

/**
 * ダウンロードする
 */
const download = async (info: Info): Promise<any> => {
  const digits = calcDigits(info.urls.length);

  const setting = await getSaveFilePathSetting(info.urls.length === 1);
  const pathElems = setting.split('/');
  const savePaths = await getSavePath(pathElems, info);
  const fileNameSetting = savePaths.pop();
  const savePath = savePaths.join('/');
  if (!fileNameSetting) {
    throw new Error('save file path setting is invalid!');
  }
  for (let i = 0; i < info.urls.length; i++) {
    const url = info.urls[i];
    const index = i + 1;
    const saveFileName = getSaveFileName(fileNameSetting, url, digits, index);
    const saveFilePath =
      savePath !== '' ? savePath + '/' + saveFileName : saveFileName;
    try {
      const downloadId = await browser.downloads.download({
        url,
        filename: saveFilePath,
        conflictAction: 'uniquify',
      });
      downloadingIds.push(downloadId);
    } catch (e) {
      if (e instanceof Error) {
        return { error: e.message };
      }
    }
  }
};

// main
browser.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'download') {
    if (downloadingIds.length) {
      return Promise.resolve({
        error: browser.i18n.getMessage('errWaitOtherDownload'),
      });
    }
    tabId = sender.tab?.id;
    return download(message);
  }
});

browser.downloads.onChanged.addListener(async (delta) => {
  if (downloadingIds.includes(delta.id) && delta.state) {
    if (delta.state.current === 'complete') {
      downloadingIds.splice(downloadingIds.indexOf(delta.id), 1);
      if (tabId !== undefined) {
        browser.tabs.sendMessage(tabId, {
          type: 'downloaded',
        });
      }
    }
  }
});
