var lastScrolled;
var scrollSpeed = 100;

var status_val = {
  "error": "",
  "success": true,
  "program": [],
  "listing": [],
  "": [],
  "pc": [],
  "bytesUsed": 0
};

let response = {
  "success": true,
  "filename": '',
  "error": ''
};

$(document).ready(function () {
  // upload 
  var uploadButton = document.getElementById("upload");
  uploadButton.addEventListener("click", upload_file);

  $("textarea.listing").css({
    "font-family": "monospace",
    "font-size": "13px",
    "line-height": "14px",
  });
  $("#encodebutton").click(encodeProgram);
  $("#decodebutton").click(decodeHex_d);
  $("#copylink").click(copyLink);
  $("#downloadbutton").click(download).attr("disabled", "disabled");
  $("#clearsource").click(function () {
    $("#dm42listing").val("");
    makeDirty();
    clearStatus();
  });
  $("#clearhex").click(function () {
    $("#dm42code").val("");
    $("#dm42pc").val("");
    makeDirty();
    clearStatus();
  });
  watchScroll();
  watchChanges();
});
function copyLink() {
  $("#dm42listing").select();
  document.execCommand("copy");
  // alert("Listing copied to clipboard");
}

function watchScroll() {
  lastScrolled = null;
  $("textarea.listing").scroll(scrolled);
  setTimeout(scrollTimeout, scrollSpeed);
}

function scrollTimeout() {
  if (lastScrolled != null) {
    var target = $("#" + lastScrolled);
    var topTarget = $(target).scrollTop();
    ignoreScroll();
    $("textarea.listing").each(function () {
      if ($(this).id != lastScrolled) {
        $(this).scrollTop(topTarget);
      }
    });
    lastScrolled = null;
    watchScroll();
  }
  setTimeout(scrollTimeout, scrollSpeed);
}

function ignoreScroll() {
  $("textarea.listing").off("scroll");
}

function scrolled(ev) {
  lastScrolled = ev.target.id;
}

function download() {
  var hexdata = $("#dm42code").val().replace(/\s/g, "");
  var postData = JSON.stringify({ hex: hexdata });
  let parsedData = JSON.parse(postData);
  if (parsedData == null) {
    badRequest("Unable to parse data posted");
  }
  else if (!parsedData.hasOwnProperty('hex')) {
    badRequest('No hex data posted');
  }
  else {
    let hex = parsedData.hex;
    if ((hex.length & 0x0001) === 1) {
      badRequest("Odd number of hex digits posted");
    } else if (!(/[^\da-e]/.test(hex))) {
      badRequest('Invalid hex data posted');
    } else {
      let rawData = hex2bin(hex);
      // let filename = generateUniqueFileName("myFile", ".raw");
      // response.filename = encodeURIComponent(filename);
      createAndDownloadFile(rawData, 'text/plain', 'myFile', '.raw')
      // file_put_contents(filename, rawData);
    }
  }
  // Header('Content-Type: application/json');
  // exit(0);
  // $.post("download.php", postData, fileGenerated).fail(failGenerate);
}

function generateUniqueFileName(prefix = 'temp', extension = '') {
  const timeStamp = new Date().getTime();
  const randomString = Math.random().toString(36).substr(2, 5);
  const uniqueFileName = `${prefix}_${timeStamp}_${randomString}${extension}`;
  return uniqueFileName;
}

function createAndDownloadFile(content = '', mimeType = 'text/plain', prefix = 'temp', extension = '') {
  const uniqueFileName = generateUniqueFileName(prefix, extension);
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = uniqueFileName;
  link.style.display = 'none';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function badRequest(msg) {
  response.success = false;
  response.error = msg;
  // Header('HTTP/1.1 400 Bad request');
}



function fileGenerated(rx) {
  if (rx.success) {
    document.location.href = "download.php?filename=" + rx.filename;
  }
}

function failGenerate(rx) {
  console.log("generate failed");
  console.log(rx);
}

function decodeHex_d() {
  // retrieve the hex data
  var hexdata = $("#dm42code").val().replace(/\s/g, "");
  var postData = JSON.stringify({ hex: hexdata });
  ignoreChanges();
  let parsedData = JSON.parse(postData);

  if (parsedData.hasOwnProperty('hex')) {
    status_val = decodeHex(parsedData.hex);
    let listingText = status_val["listing"].join("\n");
    $('#dm42listing').val(listingText);
    $('#dm42pc').val(status_val["pc"].join("\n"));
    $('#dm42code').val(status_val["hex"].join("\n"));
    if (status_val) {
      hexDecoded(status_val);
    } else {
      failDecode(status_val);
    }
  }
}

function ignoreChanges() {
  $("#dm42listing").off("change");
  $("#dm42code").off("change");
}

function watchChanges() {
  $("#dm42listing").change(makeDirty);
  $("#dm42code").change(makeDirty);
}

function makeDirty() {
  $("#downloadbutton").attr("disabled", "disabled");
}

function hexDecoded(rx) {
  if (rx.success) {
    $("#statusmessage").text("Status: OK");
    $("#downloadbutton").removeAttr("disabled");
  } else {
    var msg = 'Status: <span class="errormsg">' + rx.error + "</span>";
    $("#statusmessage").html(msg);
    makeDirty();
  }
  var listing = rx.listing.join("\n");
  $("#dm42listing").val(listing);
  var hex = rx.hex.join("\n");
  $("#dm42code").val(hex);
  var pc = rx.pc.join("\n");
  $("#dm42pc").val(pc);
  watchChanges();
}

function failDecode(rx) {
  var errorStatus =
    'Status: <span class="errormsg">HTTP response code ' +
    rx.status +
    " (" +
    rx.statusText +
    ")</span>";
  $("#statusmessage").html(errorStatus);
  watchChanges();
}

function encodeProgram() {
  var encoded;
  ignoreChanges();
  var toPost = {
    program: $("#dm42listing").val(),
    greedycomments: $("#greedycomment").prop("checked"),
    translatecomments: $("#translatecomments").prop("checked"),
  };
  var postData = JSON.stringify(toPost);
  const parsedData = JSON.parse(postData);

  if (parsedData.hasOwnProperty('program')) {
    const greedy = parsedData.hasOwnProperty('greedycomments') ? (parsedData['greedycomments'] !== false) : false;
    const translate = parsedData.hasOwnProperty('translatecomments') ? (parsedData['translatecomments'] !== false) : false;
    encoded = encodeProgram_v(parsedData['program'], greedy, translate);
    if (encoded['success']) {
      status_val = decodeWithComments(encoded['lines'], encoded['rawhex']);
      let listingText = status_val["listing"].join("\n");
      $('#dm42listing').val(listingText);
      $('#dm42pc').val(status_val["pc"].join("\n"));
      $('#dm42code').val(status_val["hex"].join("\n"));
      prgEncoded(status_val)
    } else {
      status_val['success'] = false;
      status_val['error'] = encoded['error'];
      failDecode(status_val)
    }
  }
}

function clearStatus() {
  $("#statusmessage").html("Status: OK");
}

function prgEncoded(rx) {
  if (rx.success) {
    $("#statusmessage").text("Status: OK");
    var listing = rx.listing.join("\n");
    $("#dm42listing").val(listing);
    $("#downloadbutton").removeAttr("disabled");
  } else {
    var msg = 'Status: <span class="errormsg">' + rx.error + "</span>";
    $("#statusmessage").html(msg);
    makeDirty();
  }
  var hex = rx.hex.join("\n");
  $("#dm42code").val(hex);
  var pc = rx.pc.join("\n");
  $("#dm42pc").val(pc);
  watchChanges();
}

// upload
function upload_file() {
  var fileInput = $('#rawfile')[0];
  var fileContentElement = $('#fileContent');
  var uploadedFileName = fileInput.files[0].name;

  if (fileInput.files && fileInput.files[0]) {
    if (uploadedFileName.endsWith('.raw')) {
      status_val['success'] = true;
      const reader = new FileReader();

      reader.onload = function (event) {
        const byteArray = new Uint8Array(event.target.result);
        var result = bin2hex(byteArray);
        const listingText = result["listing"].join("\n");

        $('#dm42listing').val(listingText);
        $('#dm42pc').val(result["pc"].join("\n"));
        $('#dm42code').val(result["hex"].join("\n"));
      };
      reader.readAsArrayBuffer(fileInput.files[0]);
    } else {
      status_val['success'] = false;
      status_val['error'] = "The file uploaded was not a .raw file";
    }
  } else {
    fileContentElement.text('No file selected');
  }
}
