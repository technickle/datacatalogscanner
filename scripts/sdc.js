var dataCatalog;
function processCatalog(webUrl) {
  console.log(webUrl);
  jQuery.getJSON(webUrl,null,function(data,status,jqXhr) {
    dataCatalog = data;
    $("#dc_result").html('<span id="dc_count"></span><table id="dc_table" cellpadding="0" cellspacing="0" border="0" class="display" width="100%"></table>');
    $("#dc_table").DataTable({
      // "ajax": webUrl,   // loading data this way doesn't work. Maybe a jquery version compatability issue?
      "data": dataCatalog,
      "paging": false,
      "processing": true,  // only useful if DataTable's ajax handler is used
      "order": [[1, "asc"]],
      "columns": [
        {"title":"Theme(s)", "data": function(full, type, val){
          if (typeof full.theme === "undefined") {
            return ""
          } else {
            return full.theme.join(", ");
          }
        }},
        {"title":"Title", "data": "title", "render": function(data, type, full, meta){
          if (full.landingPage) { return '<a href="' + full.landingPage + '" target="_new">' + data + '</a>'}
            else {return data}
          }},
        {"title":"Description", "data":"description"},
        {"title":"Keyword(s)", "data": function(full, type, val) {
          if (typeof full.keyword === "undefined") {
            return ""
          } else {
            return full.keyword.join(", ");
          }
        }},
        {"title":"Modified", "data":"modified"},
        {"title":"~Columns", "data": function(full, type, val) {
          if (full.socrataColumnCount) { return full.socrataColumnCount }
            else {return "-"}
        }},
        {"title":"Location", "data": function(full, type, val) {
          if (full.socrataLocationField) { return full.socrataLocationField }
            else {return "-"}
        }},
        {title:"Identifier", "data":"identifier"}
      ]
    });
    $("#dc_count").text('Catalog entries found: ' + $("#dc_table").DataTable().rows()[0].length);
  });
}

// this function updates the dataCatalog with a few extra fields including column count and whether a location datatype exists
//   each dataset has to be queried in turn, so this will be time consuming, depending upon the size of the catalog
function scanSocrataCatalogEntries(dc_table) {
  // iterate through each dataCatalog item
  dc_table.DataTable().data().each(function(dr){
    // exclude the data.json entry
    if (dr.identifier=="data.json") {return}
    // queue up an ajax request to get a single row of data for each dataset
    $.ajaxQueue({
      // dataRow: dr,
      url: "https://data.ny.gov/resource/" + dr.identifier + "?$limit=1", //todo: code to generate [domain]/resources/[dataset id]/rows.json?$limit=1 url
      type: "GET",
      success: function(data) {
        // this callback fires when the ajax request completes
        if (data[0]) {
          dr.socrataLocationField = checkForSocrataLocationField(data[0])
          dr.socrataColumnCount = countFields(data[0])
          // console.log(data[0]);
          console.log(dr);
          // code here to have datatable render updated info
        }
      },
      error: function(jqXHR, status, error) {
        dr.scanError = status + ", " + error;
        console.log(status, error);
        // need handler to update UI
      }
    })
  })
}

// function to check a socrata json response for a location field; returns true or false
// NOTE: this may not be included if the row doesn't have a value (NULL)
function checkForSocrataLocationField(datarow) {
  if (datarow.location) {
    if (datarow.location.latitude && datarow.location.longitude) { return true;}
  }
  return false;
}

// function to check a socrata json response for field count.
// NOTE: fields without values (NULLS) are not included in json from socrata!
//   this value is only as accurate as the number of non-null values in the first row!
function countFields(obj) {
  return Object.keys(obj).length;
}

// utility function which serves as a serial queue for jQuery ajax requests
var ajaxQueue = $({});
$.ajaxQueue = function(ajaxOptions) {
  // grab a reference to the original callback function
  var completeCallback = ajaxOptions.complete;
  // insert the ajax function into the queue
  ajaxQueue.queue(function(next) {
    // replace the callback so it fires the next item in the queue
    ajaxOptions.complete = function() {
      // fire the original callback
      if (completeCallback) {completeCallback.apply(this,arguments)}
      // fire the next function in the queue
      next();
    };
    // make the ajax call
    $.ajax(ajaxOptions);
  })
}
