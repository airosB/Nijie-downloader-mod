import browser from 'webextension-polyfill';

/**
 * 詳細画像URLを取得する
 */
const getPopupUrl = (): string => {
  const popupLink = document.querySelector(
    '#main-center-none #gallery_open #img_filter > a',
  ) as HTMLAnchorElement;
  return popupLink ? popupLink.href : '';
};

/**
 * 詳細画像ページを取得する
 */
const fetchPopupContent = async (popupUrl: string): Promise<string | null> => {
  try {
    const response = await fetch(popupUrl);
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    return await response.text();
  } catch (error) {
    console.error('Failed to fetch popup content:', error);
    return null;
  }
};

/**
 * ダウンロードする画像URLのリストを取得する
 */
const getImageSources = (htmlContent: string): string[] => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(htmlContent, 'text/html');

  const images = doc.querySelectorAll('#img_window a > img');
  const imageUrls = Array.from(images).map((image => (image as HTMLImageElement).src))
  const videos = doc.querySelectorAll('#img_window a > video');
  const videoUrls = Array.from(videos).map((video => (video as HTMLVideoElement).src))
  return [...imageUrls, ...videoUrls]
};

/**
 * ユーザーIDを取得する
 */
const getUserId = (): string => {
  const userPageUrl = (
    document.querySelector('#pro > p.user_icon > a') as HTMLAnchorElement
  ).href;
  const userId = userPageUrl.match(/id=(\d+)$/)?.[1];
  return userId || '';
};

/**
 * タイトルを取得する
 */
const getTitle = (): string => {
  const title = document.querySelector('.illust_title')?.textContent;
  return title || '';
};

/**
 * ユーザー名を取得する
 */
const getUserName = (): string => {
  const userName = document.querySelector(
    '#pro > p.user_icon > a',
  )?.textContent;
  return userName || '';
};

/**
 * イラストIDを取得する
 */
const getIllustId = (): string => {
  const illustId = location.search.match(/id=(\d+)/)?.[1];
  return illustId || '';
};

/**
 * 投稿時間を取得する
 */
const getPostDate = (): string => {
  const postDate = document
    .querySelector('#view-honbun > p > span')
    ?.textContent?.replace('投稿時間：', '');
  return postDate || '';
};

/**
 * バックグラウンドスクリプトからのメッセージを処理する
 */
const handleMessage = (request: any) => {
  if (request.type === 'downloaded') {
    downloaded++;
    if (downloaded === sources.length) {
      messageElem.textContent = browser.i18n.getMessage('done');
      browser.runtime.onMessage.removeListener(handleMessage);
      downloaded = 0;
    } else {
      messageElem.textContent = downloaded + ' / ' + sources.length;
    }
  }
};

/**
 * Downloadボタンが押された時の処理
 */
const save = async (): Promise<void> => {
  if (isClicked) {
    if (!confirm(browser.i18n.getMessage('askContinue'))) return;
  } else {
    isClicked = true;
  }

  browser.runtime.onMessage.addListener(handleMessage);

  const popupUrl = getPopupUrl();
  if (!popupUrl) {
    alert('Error: Could not find popup URL.');
    return;
  }

  const popupContent = await fetchPopupContent(popupUrl);
  if (!popupContent) {
    alert('Error: Failed to load popup content.');
    return;
  }

  sources = getImageSources(popupContent);
  if (sources.length === 0) {
    alert('No images found for download.');
    return;
  }

  const response = await browser.runtime.sendMessage({
    type: 'download',
    urls: sources,
    title: getTitle(),
    illustId: getIllustId(),
    userId: getUserId(),
    userName: getUserName(),
    postDate: getPostDate(),
  });
  if (response && response.error) {
    alert('Error!\n' + response.error);
    return;
  }
  messageElem.textContent = '0 / ' + sources.length;
};

const init = () => {
  const boxElem = document.createElement('div');
  boxElem.className = 'nijie_downloader-wrapper';

  const buttonStyles = [
    'border: 6px solid #FFEA00',
    'background: #ffffff',
    'border-radius: 11px',
    'cursor: pointer',
    'font-size: 150%',
    'font-weight: bold',
    'padding: 5px 10px',
    'box-shadow: inset 1px 1px 4px 0px rgba(0, 0, 0, 0.6)',
  ]

  const downloadBtn = document.createElement('button');
  downloadBtn.className = 'nijie_downloader-download_button';
  downloadBtn.style.cssText = buttonStyles.join(';');
  downloadBtn.textContent = browser.i18n.getMessage('download');
  downloadBtn.onclick = save;
  boxElem.appendChild(downloadBtn);
  messageElem.className = 'nijie_downloader-message';
  boxElem.appendChild(messageElem);
  document.getElementById('view-center-button')?.appendChild(boxElem);
};

let sources: string[];
const messageElem = document.createElement('p');
let isClicked = false;
let downloaded = 0;

if (document.readyState == 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
