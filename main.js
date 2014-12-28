var files = {};
var pageQueue = [];
var MAX_RESULTS_PER_PAGE = 10;

var FILE_CHOOSER_PARAMS = {
  cities: {canBeEmpty: false, columns: ['Zip Code']},
  lastNames: {canBeEmpty: false, columns: ['Last Name']},
  results: {canBeEmpty: true, columns: ['Timestamp', 'Zip Code', 'Last Name', 'Full Name', 'Phone', 'Address 1', 'Address 2', 'City', 'State']},
  searches: {canBeEmpty: true, columns: ['Timestamp', 'Last Name', 'Zip Code']}
};

function main() {
  bindButtons();
  loadPreviousFiles();
  setupLoadPage();
}

function loadPreviousFiles() {
  chrome.storage.local.get(Object.keys(FILE_CHOOSER_PARAMS), function(localStorage) {
    $JS.forOwn(localStorage, function(id, fileKey) {
      chrome.fileSystem.restoreEntry(id, function(entry) {
        if (entry) {
          getFileChooser(fileKey)(entry);
        }
      });
    });
  });
}

function bindButtons() {
  $JS.forOwn(FILE_CHOOSER_PARAMS, function(params, key) {
    setFileChooser(key);
  });

  $('#btnFindPeople').click(findPeople);
}

function setFileChooser(fileKey) {
  var selSuffix = fileKey.charAt(0).toUpperCase() + fileKey.slice(1);
  $('#btn' + selSuffix).click(function() {
    chrome.fileSystem.chooseEntry({type:'openWritableFile'}, getFileChooser(fileKey));
  });
}

function getFileChooser(fileKey) {
  var selSuffix = fileKey.charAt(0).toUpperCase() + fileKey.slice(1);
  var selBtn = '#btn' + selSuffix;
  var selTxt = '#txt' + selSuffix;
  var params = FILE_CHOOSER_PARAMS[fileKey];
  var canBeEmpty = params.canBeEmpty;
  var columns = params.columns;
  return function(entry) {
    readFileAsText(entry, function(text) {
      var error,
          csvRows = $JS.parseCSV(text, true),
          row1 = csvRows[0];

      // If there is at least one row make sure that all of the required
      // columns are found.
      if (row1) {
        error = columns.reduce(function(error, colName) {
          if (!error && !$JS.hasOwn(row1, colName)) {
            return 'A column named "' + colName + '" should be in the file.';
          }
        }, error);
      }
      // If no rows were found, make sure that an empty file is allowed.
      else if (!canBeEmpty) {
        error = 'The file is empty.';
      }

      // If an error was encountered show it in the textbox.
      if (error) {
        $(selBtn).attr('class', 'red-button full-button');
        $(selTxt).addClass('error').val(error);
      }
      // Since no errors occurred show the file path in the textbox.
      else {
        $(selBtn).attr('class', 'green-button full-button');
        files[fileKey] = {
          entry: entry,
          rows: csvRows
        };
        chrome.fileSystem.getDisplayPath(entry, function(path) {
          $(selTxt).removeClass('error').val(path);
        });

        // Store the file to be chosen the next time the app opens.
        var obj = {};
        obj[fileKey] = chrome.fileSystem.retainEntry(entry);
        chrome.storage.local.set(obj);
      }
    });
  };
}

function readFileAsText(fileEntry, callback) {
  fileEntry.file(function(file) {
    var reader = new FileReader();
    reader.onload = function(e) {
      callback(e.target.result);
    };
    reader.readAsBinaryString(file);
  });
}

function saveFileAsText(fileEntry, text, callback) {
  // Create a FileWriter object for our FileEntry (log.txt).
  fileEntry.createWriter(function(fileWriter) {
    if (callback) {
      fileWriter.onwriteend = callback;
    }
    fileWriter.write(new Blob([text], {type: 'text/plain'}));
  });
}

function findPeople() {
  if (!files.cities) {
    return alert('A valid cities file must be provided.');
  }
  if (!files.lastNames) {
    return alert('A valid last names file must be provided.');
  }
  if (!files.searches) {
    return alert('A valid searches file must be provided.');
  }
  if (!files.results) {
    return alert('A valid results file must be provided.');
  }

  fillSearches();

  doNextSearch();
}

function saveAllFiles() {
  try {
    $JS.forOwn(files, function(dict, key) {
      if (key == 'results' || key == 'searches') {
        var entry = dict.entry;
        var rows = dict.rows;
        var text = dictArrayToCSV(rows);
        saveFileAsText(entry, text);
      }
    });
  }
  catch(e) {
    alert(e.message);
    console.log(e);
  }
}

function doNextSearch(did_a_search) {
  if (did_a_search) {
    var search = files.searches.rows.pop();
    search.Timestamp = +new Date;
    files.searches.rows.unshift(search);
    saveAllFiles();
    console.groupEnd();
  }
  var search = files.searches.rows.slice(-1)[0];

  console.group('Doing search:', JSON.stringify(search));

  pageQueue.push({
    type: 'index',
    search: search,
    url: 'http://www.whitepages.com/name/' + search['Last Name'] + '/' + search['Zip Code'],
    number: 1
  });
  loadNextPage();
}

function getIndexReader(search, pageNum) {
  return function(jqWrapper, url) {
    var jqLogoWrap = jqWrapper.find('.logo-wrapper');

    if (!jqLogoWrap[0]) {
      return alert('Ending searches because whitepages is no longer sending expected data.');
    }

    var jqResults = jqWrapper.find('.serp-results');
    var exactMatches = (jqResults.text().match(/(\d+)[\s\xA0]+exact/) || [0,0])[1];
    var nextPageOffset = pageNum * MAX_RESULTS_PER_PAGE;
    var pageOffset = nextPageOffset - MAX_RESULTS_PER_PAGE;
    var maxMatchesOnPage = exactMatches - pageOffset;

    var count = jqWrapper.find('li[itemscope]:lt(' + maxMatchesOnPage + ').has_phone a.clickstream-link').each(function(i, a) {
      pageQueue.push({
        type: 'person',
        search: search,
        url: 'http://www.whitepages.com' + a.pathname,
        number: pageNum
      });
    }).length;

    console.log('Page', pageNum, 'for', search['Last Name'], 'in', search['Zip Code'], 'contains', count, 'match' + (count - 1 ? 'es' : ''));

    if (exactMatches > nextPageOffset) {
      pageQueue.push({
        type: 'index',
        search: search,
        url: 'http://www.whitepages.com/name/' + search['Last Name'] + '/' + search['Zip Code'] + '/' + (pageNum + 1),
        number: pageNum + 1
      })
    }

    loadNextPage();
  };
}

function getPersonReader(search, pageNum) {
  return function(jqWrapper, url) {
    var jqPerson = jqWrapper.find('.person.detail');

    if (!jqPerson[0]) {
      return alert('Ending searches because whitepages is no longer sending expected data.');
    }

    var fullName = jqPerson.find('.name:eq(0)').text();
    var addr1 = jqPerson.find('.address-primary:eq(0)').text();
    var addr2 = jqPerson.find('.address-secondary:eq(0)').text();
    var loc = jqPerson.find('.address-location:eq(0)').text() || '';
    var provider = jqPerson.find('.tel p').text();
    jqPerson.find('a[data-gaevent=phone_number]').each(function(i, e) {
      var phone = $(e).text();
      var provider = jqPerson.find('.tel p:eq(' + i + ')').text();
      var result = {
        'Full Name': fullName,
        Phone: phone,
        'Address 1': addr1,
        'Address 2': addr2,
        City: loc.split(',')[0],
        State: (loc.match(',[\s\xA0]+(\w+)') || [])[1],
        'Zip Code': search['Zip Code'],
        'Last Name': search['Last Name'],
        Timestamp: +new Date
      };
      files.results.rows.push(result);
      console.log('Added', result['Full Name'], JSON.stringify(result));
    });

    loadNextPage();
  };
}

function loadNextPage() {
  var page = pageQueue.shift();
  if (page) {
    loadPage(page.url, (page.type == 'index' ? getIndexReader : getPersonReader)(page.search, page.number));
  }
  else {
    doNextSearch(true);
  }
}

function setupLoadPage() {
  var loadPageCallback;

  var jqWebview = $('<webview />').appendTo('body').css({
    width: 0,
    height: 0,
    overflow: 'hidden',
    position: 'absolute'
  }).bind('contentload', function() {
    var me = this;
    setTimeout(function() {

      me.executeScript({ code: '(__scraper__=(window.__scraper__ || 0) + 1) < 2' }, function(firstTimeArgs) {
        if (firstTimeArgs[0]) {
          me.executeScript({ code: 'document.body.innerHTML' }, function(htmlArgs) {
            me.executeScript({ code: 'location.href' }, function(urlArgs) {
              if (loadPageCallback) {
                loadPageCallback($('<div />').html(htmlArgs[0]), urlArgs[0]);
              }
            });
          });
        }
      });
    }, 1000);
  });

  loadPage = function(url, callback) {
    jqWebview.attr('src', url);
    loadPageCallback = callback;
  };
}

function fillSearches() {
  var dictZipCodes = {};
  var searches = files.searches.rows.map(function(row) {
    (dictZipCodes[row['Zip Code']] = dictZipCodes[row['Zip Code']] || {})[row['Last Name']] = 1;
    return row;
  });

  var cities = files.cities.rows;
  var lastNames = files.lastNames.rows;

  cities.forEach(function(cityRow) {
    var zipCode = cityRow['Zip Code'];
    var dictLastNames = (dictZipCodes[zipCode] = dictZipCodes[zipCode] || {});
    lastNames.forEach(function(lastNameRow) {
      var lastName = lastNameRow['Last Name'];
      if (!$JS.hasOwn(dictLastNames, lastName)) {
        dictLastNames[lastName] = 1;
        searches.push({
          Timestamp: 0,
          'Last Name': lastName,
          'Zip Code': zipCode
        });
      }
    })
  });

  // Sort searches:  Timestamp DESC, Last Name DESC, Zip Code DESC 
  files.searches.rows = searches.sort(function(search1, search2) {
    var diff = search2.Timestamp - search1.Timestamp;
    return search2.Timestamp - search1.Timestamp ||
      (search1['Zip Code'] == search2['Zip Code']
        ? search1['Last Name'] < search2['Last Name'] ? 1 : -1
        : search1['Zip Code'] < search2['Zip Code'] ? 1 : -1);
  });
}

function dictArrayToCSV(arr) {
  // Keep track of all of the different columns.
  var colNameToIndex = {};
  var colNames = [];
  var colCount = 0;
  var rows = arr.map(function(dict, rowIndex) {
    var row = [];
    $JS.forOwn(dict, function(value, colName) {
      if (!$JS.hasOwn(colNameToIndex, colName)) {
        colNames.push(colName);
        colNameToIndex[colName] = colCount++;
      }
      row[colNameToIndex[colName]] = value;
    });
    return row;
  });

  return [colNames].concat(rows).map(function(row) {
    row.length = colCount;
    return row.map(function(value) {
      return /[\r\n,"]/.test(value) ? '"' + value.replace(/"/g, '""') + '"' : value;
    }).join(',');
  }).join('\n');
}

function alert(options) {
  if ($JS.typeOf(options, 'String')) {
    options = { message: options };
  }
  var msg = options.message;
  var buttons = options.buttons || ['OK'];
  var callback = options.callback;
  var container = $('<div><div class="message" /><hr /><div class="buttons" /></div>')
    .find('.message').text(msg).end()
    .find('.buttons').append(buttons.map(function(button) {
      return $('<button class="blue-button" style="margin: 0 5px;" />').text(button).click(function() {
        $.unblockUI();
        callback && callback(button);
      });
    })).end();
  $.blockUI({
    message: container,
    css: {
      borderRadius: '10px',
      padding: '5px',
      fadeIn: 500,
      fadeOut: 500
    }
  });
}

$(main);