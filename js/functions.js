// JSONデータを取得する関数
function getJsonData(jsonUrl) {
  return new Promise((resolve, reject) => {
    $.getJSON(jsonUrl, function (data) {
      resolve(data);
    }).fail(function () {
      reject('Failed to load JSON file');
    });
  });
}

// CSVデータを取得する関数
async function fetchCsvData(fileName, skipRowCount = 0) {
  try {
    const response = await fetch(fileName);
    const text = await response.text();
    return parseCsv(text, skipRowCount);
  } catch (error) {
    throw new Error('Failed to load CSV file:' + fileName);
  }
}

// CSVデータをパースする関数（csvデータ内の「,」は「，」にしているため「,」に変換して返却）
function parseCsv(csvText, skipRowCount) {
  var regx = new RegExp(appsettings.commaInString, 'g');
  return csvText
    .trim()
    .split(/\r?\n|\r/)
    .slice(skipRowCount)
    .map((line) => line.split(',').map((value) => value.replace(regx, ',')));
}

// データをローカルストレージからクリアする関数
function removeLocal(key) {
  localStorage.removeItem(appsettings.appName + '.' + key);
}

// データをローカルストレージにセットする関数
function setLocal(key, value) {
  localStorage.setItem(appsettings.appName + '.' + key, value);
}

// ローカルストレージからデータをゲットする関数
function getLocal(key) {
  return localStorage.getItem(appsettings.appName + '.' + key);
}

// ローカルストレージから配列を取得(nullは空に)
function getLocalArray(key) {
  return (
    JSON.parse(localStorage.getItem(appsettings.appName + '.' + key)) ?? []
  );
}

// ローカルストレージに配列設定(nullは空に)
function setLocalArray(key, array) {
  localStorage.setItem(
    appsettings.appName + '.' + key,
    JSON.stringify(array ?? [])
  );
}

// エラー時処理
function showError(errorMsg1, errorMsg2) {
  // コンソールに表示
  console.error(errorMsg1, errorMsg2);
  // 画面に表示
  alert(errorMsg2);
}

// カラーチェンジ
function changeColor(plusCount) {
  // 今のカラーインデックスを取得し、次のインデックス設定（ない場合最新のもの）
  var colorIndex =
    Number(getLocal('colorIndex') ?? colorSets.length - 1) + plusCount;
  // 設定するカラーを設定（ない場合最初に戻る）
  var colorSet = colorSets[colorIndex] ?? colorSets[0];
  $('body').css({
    background: colorSet[1],
    color: colorSet[2],
  });
  $('.btn--main').css({
    'background-color': colorSet[3],
    color: colorSet[4],
  });
  // 今のカラー設定をローカルストレージに保存
  var colorIndexNow = colorSets[colorIndex] ? colorIndex : 0;
  setLocal('colorIndex', colorIndexNow);
  // 今のカラー表示
  $('#changeColor').html(
    'Color ↺ <br>(' + (colorIndexNow + 1) + '/' + colorSets.length + ')'
  );
}

// 未来日までの日数取得
function getDaysToNextMonthDay(pastDateString) {
  const today = new Date(globalToday.setHours(0, 0, 0, 0));
  const [, month, day] = pastDateString.split('/').map(Number);

  let nextDate = new Date(today.getFullYear(), month - 1, day);
  if (nextDate < today) nextDate.setFullYear(today.getFullYear() + 1);

  return Math.ceil((nextDate - today) / (1000 * 60 * 60 * 24));
}

// 未来日までの年数取得
function getYearsToNextMonthDay(pastDateString) {
  const today = globalToday;
  const [year, month, day] = pastDateString.split('/').map(Number);

  return (
    today.getFullYear() -
    year +
    (new Date(today.getFullYear(), month - 1, day) < today ? 1 : 0)
  );
}

// 過去日からの日数取得（日付の0埋めや曜日ありでも対応）
function getDaysFromDate(dateString) {
  // 曜日などの余分な文字列を削除（例："(月)" や "（月）"）
  const cleanedDate = dateString
    .replace(/[（(][^）)]+[）)]/, '') // "（月）" や "(月)" の除去
    .trim()
    .replace(/\//g, '-'); // "/" を "-" に統一

  // Date オブジェクトに変換
  const inputDate = new Date(cleanedDate);
  if (isNaN(inputDate)) {
    throw new Error(`無効な日付形式です: ${dateString}`);
  }

  // 日数差を計算（+1して今日を含む）
  const diffTime = globalToday - inputDate.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24)) + 1;
}

// 二次元配列を年月日でソート
function sortByYearMonthDay(data, sortColIndex, sortOrder) {
  return data.sort((a, b) => {
    const dateA = new Date(a[sortColIndex]);
    const dateB = new Date(b[sortColIndex]);
    return sortOrder ? dateA - dateB : dateB - dateA; // 昇順：降順
  });
}

// 二次元配列を月日でソート
function sortByMonthDay(arr, sortColIndex, sortOrder) {
  const today = new Date(globalToday.setHours(0, 0, 0, 0));

  function daysToToday(dateString) {
    const [, month, day] = dateString.split('/').map(Number);
    const date = new Date(today.getFullYear(), month - 1, day);
    if (date < today) date.setFullYear(today.getFullYear() + 1);
    return (date - today) / (1000 * 60 * 60 * 24);
  }

  // 配列のコピーを作成
  const arrCopy = [...arr];

  // コピーをソート
  return arrCopy.sort(
    (a, b) =>
      sortOrder
        ? daysToToday(a[sortColIndex]) - daysToToday(b[sortColIndex]) // 昇順
        : daysToToday(b[sortColIndex]) - daysToToday(a[sortColIndex]) // 降順
  );
}

// ソートタグ作成
function createSortTag(display) {
  // 変数初期化
  var tag = '';

  // タグ生成
  // ソートタグ生成
  tag += '<div class="sort">';
  Object.values(SORTMODE).forEach(function (sortMode) {
    tag +=
      ' <a class="' +
      (sortMode.code === display.sortMode ? 'disabled' : 'active') +
      '" onclick="createDisplay(' +
      display.mode +
      ',1,' +
      sortMode.code +
      ')">' +
      sortMode.name +
      '</a>';
  });
  tag += '</div>';

  return tag;
}

function createPagingTag(display) {
  const tagLimit = 5; // 最大表示ボタン数
  const totalItems = display.data.length;
  const itemsPerPage = display.cardPerPage;
  const currentPage = display.page;
  const totalPages = Math.ceil(totalItems / itemsPerPage);

  let tag = '<div class="pagination">';

  // 「≪」最初のページへ
  if (currentPage > 1) {
    tag += `<a class="active" onclick="createDisplay(${display.mode}, 1, ${display.sortMode})">≪</a>`;
  } else {
    tag += `<a class="disabled">≪</a>`;
  }

  // ページ範囲の計算
  let startPage = Math.max(1, currentPage - Math.floor(tagLimit / 2));
  let endPage = startPage + tagLimit - 1;
  if (endPage > totalPages) {
    endPage = totalPages;
    startPage = Math.max(1, endPage - tagLimit + 1);
  }

  // 数字ボタン
  for (let pageIndex = startPage; pageIndex <= endPage; pageIndex++) {
    tag +=
      `<a class="${currentPage === pageIndex ? 'disabled' : 'active'}" ` +
      `onclick="createDisplay(${display.mode}, ${pageIndex}, ${display.sortMode})">${pageIndex}</a>`;
  }

  // 「≫」最後のページへ
  if (currentPage < totalPages) {
    tag += `<a class="active" onclick="createDisplay(${display.mode}, ${totalPages}, ${display.sortMode})">≫</a>`;
  } else {
    tag += `<a class="disabled">≫</a>`;
  }

  tag += '</div>';
  return tag;
}

// カートタイトルタグ作成
function createCardTitleTag(
  leftDays,
  releaseDateStr,
  name,
  sortMode,
  startPhrase = ''
) {
  // 変数初期化
  var tag = '';

  // タグ生成
  if (sortMode === SORTMODE.ANNIVERSARY.code) {
    // 記念日モード
    if (leftDays == 0) {
      // 今日が記念日の場合
      tag += '<div class="card-name">今日は...<br>『' + name + '』</div>';
      tag +=
        '<div class="card-days"><span class="highlight"> ' +
        getYearsToNextMonthDay(releaseDateStr) +
        '</span>周年！</div>';
    } else {
      tag +=
        '<div class="card-name">『' +
        name +
        '』<br><span class="highlight">' +
        getYearsToNextMonthDay(releaseDateStr) +
        '</span>周年まで</div>';
      tag +=
        '<div class="card-days">あと <span class="highlight">' +
        leftDays +
        '</span>日</div>';
    }
  } else if (sortMode === SORTMODE.HISTORY.code) {
    // 過去モード
    tag +=
      '<div class="card-name">『' +
      name +
      '』<br>' +
      startPhrase +
      'から</div>';
    tag +=
      '<div class="card-days"><span class="highlight">' +
      getDaysFromDate(releaseDateStr) +
      '</span>日</div>';
  }

  return tag;
}

// Youtubeタグ作成
function createMvTag(id, mvSite) {
  // 変数初期化
  var tag = '';

  // タグ生成
  tag += '<div class="card-iframe-container">';
  tag += mvSite.startsWith('ニコニコ')
    ? '     <iframe src="https://embed.nicovideo.jp/watch/' //ニコニコ
    : '            src="https://www.youtube.com/embed/'; // YouTube
  tag += id + '" frameborder="0" allowfullscreen>';
  tag += '   </iframe> ';
  tag += '</div> ';

  return tag;
}

// Youtubeタグ作成
function createYoutubeListTag(ids) {
  // 変数初期化
  var tag = '';

  // タグ生成
  tag += '<div class="card-iframe-container">';
  tag +=
    '        <iframe src="https://www.youtube.com/watch_videos?video_ids=' +
    ids +
    '" frameborder="0" allowfullscreen>';
  tag += '   </iframe> ';
  tag += '</div> ';

  return tag;
}

// 画像クリックイベント追加
function addEnlargeImageEvent() {
  // 拡大表示用の要素を取得
  const overlay = document.getElementById('overlay');
  const overlayImage = overlay.querySelector('img');

  // すべてのimgタグにクリックイベントを追加
  document.querySelectorAll('img').forEach((image) => {
    image.addEventListener('click', () => {
      overlay.classList.add('active');
      overlayImage.src = image.src;
    });
  });

  // オーバーレイをクリックすると閉じる
  overlay.addEventListener('click', () => {
    overlay.classList.remove('active');
    overlayImage.src = ''; // フェードアウト後に画像をクリア
  });
}

// CSSルール作成
function addCssRule(selector, cssRules, imagePath) {
  // CSSルール作成
  var rule =
    ' .card-item.' +
    selector +
    '::before { background-image: url(../' +
    imagePath +
    selector +
    '.jpg); } ';

  // CSSルールにまだない場合
  if (!cssRules.includes(rule)) {
    // CSSルール追加
    cssRules.push(rule);
  }

  return cssRules;
}
