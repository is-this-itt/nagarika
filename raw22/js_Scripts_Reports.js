
var basePath = $('#hfBasePath').val();
var fullDate = new Date();
var twoDigitMonth = ((fullDate.getMonth().length + 1) === 1) ? (fullDate.getMonth() + 1) : '0' + (fullDate.getMonth() + 1);
var currentDate = fullDate.getDate() + "/" + twoDigitMonth + "/" + fullDate.getFullYear();

var UserName = 'Exported On ' + fullDate;

function renderPartials(obj, url, renderLocation) {

    $.ajax({
        type: "GET",
        url: basePath + url,
        data: { districtId: obj.districtId, divisionId: obj.divisionId, yearId: obj.yearId, seatTypeId: obj.seatTypeId, seatId: obj.seatId },
        contentType: 'application/html; charset=utf-8',
        async: false,
        success: function (dataset) {
            $('#' + renderLocation).html(dataset);

        }
    });
}

function openFeedBackPopup() {
    $('#btnFeedback').click();
}

function getUrlVars() {
    var vars = [], hash;
    var hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
    for (var i = 0; i < hashes.length; i++) {
        hash = hashes[i].split('=');
        vars.push(hash[0]);
        vars[hash[0]] = hash[1];
    }
    return vars;
}
function goDetails() {
    var obj = {};
    obj.optMode = "selectGoDetails";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.districtId = $('#districtId').val();   
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> All Sanctioned Work by Shasan and thier GO Status';
    var url = "/Reports/selectGoDetails";
    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable','landscape');

}

//function dprIAWorkStatus() {
//    var obj = {};
//    obj.optMode = "WorkStatusIA";
//    obj.zoneId = $('#zoneId').val();
//    obj.divisionId = $('#divisionId').val();
//    obj.yearId = $('#yearId').val();
//    obj.districtId = $('#districtId').val();
//    var title = 'Work Send to IA by IDA for assessment With in 25 Days';
//    var url = "/Reports/dprIAWorkStatus";
//    selectData(obj, url, title, 1, 0, 'demodprIAWork', 'simpledatatable');

//}

var animationTimer = null;
var currentIndex = -1;
var lastHighlightedRow = null;

function IDAWorkNotification() {

    if (animationTimer !== null) {
        clearInterval(animationTimer);
        animationTimer = null;
    }

    currentIndex = -1;
    lastHighlightedRow = null;

    var obj = {};
    obj.optMode = "MLAWiseFundRelease";

    var url = "/Reports/IDAWorkNotification";

    $.ajax({
        type: "POST",
        url: basePath + url,
        contentType: 'application/json; charset=utf-8',
        data: "{'obj':" + JSON.stringify(obj) + "}",
        async: false,
        success: function (dataset) {

            $('#demoWorkNotificationreDiv').html("");

            if (typeof dataset === "string") {
                dataset = JSON.parse(dataset);
            }

            if (!dataset.Table_1 || dataset.Table_1.length === 0) {
                $('#demoWorkNotificationreDiv').html(
                    "<div class='row'><div class='col-sm-12 text-center text-danger'><p>No Record Found</p></div></div>"
                );
                return;
            }
            var columnName1 = dataset.Col_1[0].Column1;
            var value1 = dataset.Table_1[0]["roleId"];
            if (value1 == "2") {
                $('#mainWorkNotificationreDiv').html("");
                return;
            }
            else if (value1 == "4") {
                $('#mainWorkNotificationreDiv').html("");
                return;
            }
            else if (value1 == "11") {
                $('#mainWorkNotificationreDiv').html("");
                return;
            }

            if (!dataset.Table_0 || dataset.Table_0.length === 0) {
                $('#demoWorkNotificationreDiv').html(
                    "<div class='row'><div class='col-sm-12 text-center text-danger'><p>No Record Found</p></div></div>"
                );
                return;
            }

            var html = "<div class='subWorkNotificationreDiv'><table id='tblWorkNotificationreDiv' class='table table-striped table-bordered'>";

            html += "<thead><tr>";
            for (var i = 0; i < dataset.Col_0.length; i++) {
                if (dataset.Col_0[i].Column1 !== "roleId") {
                    html += "<th style='text-align:center;'>" + dataset.Col_0[i].Column1 + "</th>";
                }

            }
            html += "</tr></thead>";

            html += "<tbody>";

            for (var r = 0; r < dataset.Table_0.length; r++) {

                html += "<tr>";

                for (var c = 0; c < dataset.Col_0.length; c++) {

                    var columnName = dataset.Col_0[c].Column1;
                    var value = dataset.Table_0[r][columnName];

                    html += "<td style='text-align:center;'>" + (value ? value : "") + "</td>";
                }

                html += "</tr>";
            }

            html += "</tbody></table></div>";

            $('#demoWorkNotificationreDiv').html(html);


            setTimeout(function () {
                animationTimer = setInterval(runRowAnimation, 3500);
            }, 200);
        }
    });
}


function runRowAnimation() {

    var rows = $('#tblWorkNotificationreDiv tbody tr');
    if (rows.length === 0) return;

    currentIndex++;
    if (currentIndex >= rows.length) {
        currentIndex = 0;
    }

    var row = rows.eq(currentIndex);

    if (lastHighlightedRow !== null) {
        lastHighlightedRow.removeClass('top-highlight');
    }

    row.removeClass('row-slide-up');

    void row[0].offsetWidth;

    row.addClass('row-slide-up');
    row.addClass('top-highlight');

    lastHighlightedRow = row;
}


function fn_markRead(workId) {

    var fileData = new FormData();
    fileData.append("workId", workId);

    $.ajax({
        url: basePath + "/Master/MarkAsRead",
        type: "POST",
        data: fileData,
        contentType: false,
        processData: false,
        success: function (Data) {

            if (Data.msg.split('|')[1] === "1") {
                showMessage(Data.msg);

                IDAWorkNotification();
            }
            else {
                showMessage(Data.msg);
            }
        },
        error: function (err) {
            showMessage(err.message + "|3");
        }
    });
}



function workAssignedIA() {
    var obj = {};
    obj.optMode = "workAssignedIA";
    obj.zoneId = $('#zoneId').val();
    obj.workId = $('#workId').val();
    obj.divisionId = $('#divisionId').val();
    obj.yearId = $('#yearId').val();
    obj.districtId = $('#districtId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> Work Send to IA by IDA for assessment';
    var url = "/Reports/workAssignedIA";
    selectData(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'landscape');

}


function koshagarLog() {
    var obj = {};
    obj.optMode = "koshagarLog";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.yearId = $('#yearId').val();
    obj.districtId = $('#districtId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> koshagarLog';
    var url = "/Reports/koshagarLog";
    selectData(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'landscape');

}

function MLAWiseFundRelease() {
    var obj = {};
    obj.optMode = "MLAWiseFundRelease";
    obj.seatTypeId = $('#seatTypeId').val();
    obj.seatId = $('#seatId').val();
    obj.yearId = $('#yearId').val();    
    obj.districtId = $('#districtId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> माननीय विधायक वार बजट आवंटन का विवरण';
    var url = "/Main/MLAWiseFundRelease";
    selectData1(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'portrait');

}
function expenseSummaryDetails() {
    var obj = {};
    obj.optMode = "DistrictWiseFundRelease";
    obj.districtId = $('#districtId').val();
    obj.seatTypeId = $('#seatTypeId').val();
    obj.yearId = $('#yearId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> Expense Summary Details';
    var url = "/Main/expenseSummaryDetails";
    selectData1(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'landscape');

}
function DistrictWiseFundReleaseConsolidated() {
    var obj = {};
    obj.optMode = "DistrictWiseFundReleaseConsolidated";
    obj.districtId = $('#districtId').val();
    obj.seatTypeId = $('#seatTypeId').val();
    obj.yearId = $('#yearId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> जनपद वार बजट आवंटन का विवरण';
    var url = "/Main/DistrictWiseFundRelease";
    selectData1(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'landscape');
    $('#divBack').hide();
}
function getDistrictWorkDetailsPopup(districtName, type, districtId, yearId, minDays, maxDays) {
    var obj = {};
    obj.optMode = "getDistrictWorkDetails";
    obj.districtId = districtId;
    obj.yearId = yearId;
    obj.minDays = minDays;
    obj.maxDays = maxDays;
    obj.type = type;
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> जनपद वार कार्य का विवरण';
    var url = "/Main/DistrictWiseWorkCounts";
    $('#vidhayakName').html(districtName + ' के कार्यों का विवरण');
    $('#btnProposedWork').click();  
    selectData(obj, url, title, 3, 0, 'demo3', 'simpledatatable3', 'landscape');



    //$('#divBack').hide();
}
function mlaProfile() {
    var obj = {};
    obj.optMode = "mlaProfile";   
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> माननीय विधायकों का प्रोफाइल विवरण ';
    var url = "/Main/DistrictWiseWorkCounts";
    selectData(obj, url, title, 3, 0, 'demo', 'simpledatatable', 'landscape');
   
}
function districtProfile() {
    var obj = {};
    obj.optMode = "districtProfile";
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> के जनपद के अधिकारियों का विवरण का प्रोफाइल विवरण ';
    var url = "/Main/DistrictWiseWorkCounts";
    selectData(obj, url, title, 3, 0, 'demo', 'simpledatatable', 'landscape');

}
function getWorkDistrictWisePhysical(dsitrictId,yearId) {
    var obj = {};
    obj.optMode = "getWorkDistrictWisePhysical";
    if (dsitrictId != '') {
        obj.districtId = dsitrictId;
    } else {
        obj.districtId = $('#districtId').val();
    }
    if (yearId != '') {
        obj.yearId = yearId;
    } else {
        obj.yearId = $('#yearId').val();
    }
    
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> जनपद वार कार्य का विवरण';
    var url = "/Main/DistrictWiseWorkCounts";
    selectData(obj, url, title, 3, 0, 'demo', 'simpledatatable', 'landscape');
    $('#simpledatatable tbody tr').each(function () {
        // Get the text of the last cell (td) in the row
        var lastCellText = $(this).find('td:eq(5)').text();
        var skipeed = $(this).find('td:eq(1)').text();
        if (skipeed !== "Total") {
        // Check your condition
        if (lastCellText > 0 ) {
            // Perform actions based on the condition
            $(this).find('td:eq(5)').css('color', 'white');
            $(this).find('td:eq(5)').css('font-weight', '700');
            $(this).find('td:eq(5)').css('background-color', 'rgb(239 195 70)');
            //$(this).css('color', '#fff');
        }
        var lastCellText1 = $(this).find('td:eq(6)').text();
        if (lastCellText1 > 0) {
            // Perform actions based on the condition
            $(this).find('td:eq(6)').css('color', 'white');
            $(this).find('td:eq(6)').css('font-weight', '700');
            $(this).find('td:eq(6)').css('background-color', 'rgb(253 124 91)');
            //$(this).css('color', '#fff');
            }
        }
    });
    

    $('#divBack').hide();
}
function getWorkMLAWisePhysical() {
    var obj = {};
    obj.optMode = "getWorkMLAWisePhysical";
    obj.seatId = $('#seatId').val();
    obj.seatTypeId = $('#seatTypeId').val();
    obj.yearId = $('#yearId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, माo विधायक वार कार्य का विवरण';
    var url = "/Main/DistrictWiseWorkCounts";
    selectData(obj, url, title, 2, 0, 'demo', 'simpledatatable', 'landscape');
    $('#simpledatatable tbody tr').each(function () {
        // Get the text of the last cell (td) in the row
        var lastCellText = $(this).find('td:eq(6)').text();

        // Check your condition
        if (lastCellText > 0 ) {
            // Perform actions based on the condition
            $(this).find('td:eq(6)').css('color', 'white');
            $(this).find('td:eq(6)').css('font-weight', '700');
            $(this).find('td:eq(6)').css('background-color', 'rgb(239 195 70)');
            //$(this).css('color', '#fff');
        }
        var lastCellText1 = $(this).find('td:eq(7)').text();
        if (lastCellText1 > 0) {
            // Perform actions based on the condition
            $(this).find('td:eq(7)').css('color', 'white');
            $(this).find('td:eq(7)').css('font-weight', '700');
            $(this).find('td:eq(7)').css('background-color', 'rgb(253 124 91)');
            //$(this).css('color', '#fff');
        }
    });


    $('#divBack').hide();
}
function DistrictWiseFundRelease(district, year) {
    var obj = {};
    debugger
    obj.optMode = "DistrictWiseFundRelease";
    if (district === '') {
        obj.districtId = $('#districtId').val();
    } else {
        obj.districtId = district;
    }

    if (year === '') {
        obj.yearId = $('#yearId').val();
    } else {
        obj.yearId = year;
    }

    //if (seatTypeId = '') {
    //    obj.seatTypeId = $('#seatTypeId').val();
    //} else {
    //    obj.seatTypeId = seatTypeId;
    //}
        
    //if (seatTypeId = '')
    //    obj.seatTypeId = $('#seatTypeId').val();
    
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> District Wise Fund Release Statement';
    var url = "/Main/DistrictWiseFundRelease";
    selectData1(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'landscape');

    $('#divBack').show();


}
function bindInnerDashboard() {
    
    var obj = {};
    var url = "/Home/getDashboard";
    obj.districtId = $('#planId').val();
    obj.divisionId = -1;

    obj.yearId = $('#yearId').val();
    obj.optMode = "districtWiseApplication";
    $.ajax({
        type: "GET",
        url: basePath + url,
        data: { districtId: obj.districtId, divisionId: obj.divisionId, yearId: obj.yearId },
        contentType: 'application/html; charset=utf-8',
        async: false,
        success: function (dataset) {
            $('#dashboardInner').html(dataset);

        }
    });
    
}

function getWorkDistrictWise() {
    
    var obj = {};
    obj.divisionId = -1;
    obj.districtId = districtId;
    obj.yearId = $('#yearId').val();
    var url = "/Main/getNikayDistrictWise";
    obj.optMode = "districtWiseApplication";
    var title = "District wise Work Details";    
    $('#janPadName').text('उत्तर प्रदेश के समस्त जनपद के कार्यों की स्थिति');
    $('#heading').text('उत्तर प्रदेश के समस्त जनपद के कार्यों की स्थिति');
    selectData(obj, url, title, 0, 0, 'demo', 'simpledatatable', 'landscape');
    //var table = $('#simpledatatable').DataTable();
    //// Default ordering को runtime में disable करना
    //table.order([]).draw();
    //// Custom sorting logic for fixed first column order
    //$('#simpledatatable').on('order.dt', function () {
    //    var order = table.order();

    //    if (order.length > 0) {
    //        // Reset first column's order to original
    //        var data = table.rows({ order: 'index' }).data().toArray();
    //        data.sort(function (a, b) {
    //            return a[0] - b[0]; // Keep first column in original order
    //        });
    //        table.clear().rows.add(data).draw(false);
    //    }
    //});
    $('#btnDistrictWise').hide();
    $('#btnNikayWise').hide();
    $('#districtId').val(-1);
}
function getWorkByDistrictIdHome(districtId) {
    $(".pageloader").show();
    if (districtId == '-1') {
        $('#heading').text('उत्तर प्रदेश के समस्त जनपद के कार्यों की स्थिति');
    } else {
        $('#heading').text('');
    }
    $('#districtId').val(districtId);
    var obj = {};
    obj.divisionId = -1;
    obj.districtId = districtId;

    obj.yearId = $('#yearId').val();
    //if (obj.yearId < 0) {
    //    obj.yearId = 1;
    //}
    obj.seatTypeId = $('#seatTypeId').val();
    obj.seatId = $('#seatId').val();
    var url = "/Main/getDistrictWiseHome";
    obj.optMode = "districtWiseApplication";
    renderPartials(obj, url, 'districtWiseSummary');

    $('#btnDistrictWise').show();
    $('#btnNikayWise').hide();


    var Oldid = $('#olddistrictId').val();
    if (Oldid == '') {
        Oldid = '-1';
    }
    $('#' + Oldid).attr("fill", $('#colorCode').val());
    $('#olddistrictId').val($("#districtId").val());

    var id = $("#districtId").val();
    $('#colorCode').val($('#' + id).attr("fill"));
    $('#' + id).attr("fill", "#F18B44 ");
    $('#' + id).parent().append('<text><textPath href="#' + id + '">' + $("#districtId option:selected") + '</textPath></text>');
    if (districtId > -1) {
        setTimeout(function () {
            getWorkOfNikayByDistrictId(districtId);
        }, 1000);
    }
    $(".pageloader").hide();


}
function getWorkByDistrictId(districtId) {
    $(".pageloader").show();
    if (districtId == '-1') {
        $('#heading').text('उत्तर प्रदेश के समस्त जनपद के कार्यों की स्थिति');
    } else {
        $('#heading').text('');
    }
    $('#districtId').val(districtId);
    var obj = {};
    obj.divisionId = -1;
    obj.districtId = districtId;
    
    obj.yearId = $('#yearId').val();
    //if (obj.yearId < 0) {
    //    obj.yearId = 1;
    //}
    var url = "/Main/getDistrictWise";
    obj.optMode = "districtWiseApplication";    
    renderPartials(obj, url, 'districtWiseSummary');
  
    $('#btnDistrictWise').show();
    $('#btnNikayWise').hide();
    
    
    var Oldid = $('#olddistrictId').val();
    if (Oldid == '') {
        Oldid = '-1';
    }
    $('#' + Oldid).attr("fill", $('#colorCode').val());
    $('#olddistrictId').val($("#districtId").val());

    var id = $("#districtId").val();
    $('#colorCode').val($('#' + id).attr("fill"));
    $('#' + id).attr("fill", "#F18B44 ");
    $('#' + id).parent().append('<text><textPath href="#' + id + '">' + $("#districtId option:selected") + '</textPath></text>');
    if (districtId > -1) {
    setTimeout(function () {
        getWorkOfNikayByDistrictId(districtId);
    }, 1000);
    }
    $(".pageloader").hide();
   
         
}
function getWorkOfNikayByDistrictId(districtId) {
    $(".pageloader").show();
    var obj = {};
    obj.divisionId = -1;
    obj.districtId = districtId;
    obj.yearId = $('#yearId').val();
    var url = "/Main/getNikayDistrictWise";
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> Nikay wise Work Details"
   
    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable', 'landscape');
    $(".pageloader").hide();
}
function getWorkByNikayId(divisionId, applicationType) {
    $(".pageloader").show();
    var obj = {};
    obj.divisionId = divisionId;
    obj.applicationType = applicationType;
    obj.yearId = $('#yearId').val();
    obj.districtId = $('#districtId').val();
    obj.optMode = "getWorkDetails";
    var url = "/Main/getNikayDistrictWise";
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> Nikay wise Work Details"

    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable', 'landscape');

    

    $('#btnDistrictWise').hide();
    $('#btnNikayWise').show();
    $(".pageloader").hide();



}
function getWorkDetailsDasboard(applicationType) {
    var mlaName = $("#seatId option:selected").text();
    if (mlaName == '0' || mlaName == '-1' || mlaName == 'माo विधायक चुनें') {
        mlaName = 'माननीय विधायक';
    }
    getWorkDetailsPopup(mlaName, $('#seatId').val(), $('#yearId').val(), applicationType);
}
function getWorkDetailsPopup(mlaName, seatId, yearId, applicationType) {
    $('#vidhayakName').html(mlaName + ' द्वारा अनुशंसित कार्यों का विवरण');
    $('#btnProposedWork').click();    
    var obj = {};   
    obj.applicationType = applicationType;
    obj.yearId = yearId;
    obj.seatId = seatId;
    obj.seatTypeId = $('#seatTypeId').val();
    obj.districtId = -1;
    obj.optMode = "getWorkDetails";
    var url = "/Main/getNikayDistrictWise";
    var title = "MLA/MLC wise Work Details";   
    selectData(obj, url, title, 2, 0, 'demo3', 'simpledatatable3', 'landscape');
    $('#simpledatatable3 tbody tr').each(function () {
        // Get the text of the last cell (td) in the row
        var lastCellText = $(this).find('td:last').text();

        // Check your condition
        if (lastCellText >= 45) {
            // Perform actions based on the condition
            // For example, change the background color of the row
            $(this).css('background-color', '#dc3545');
            //$(this).css('color', '#fff');
        }
    });
    
}
function getWorkMLAPhysicalWise() {
    var obj = {};
    
    obj.districtId = $('#districtId').val();
    obj.yearId = $('#yearId').val();
    obj.seatId = $('#seatId').val();
    obj.seatTypeId = $('#seatTypeId').val();
    var url = "/Main/getNikayDistrictWise";
    obj.optMode = "getWorkMLAPhysicalWise";
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> उत्तर प्रदेश के कार्यों की माननीय विधायक वार भौतिक स्थिति";
    $('#MLAName').text('उत्तर प्रदेश के कार्यों की माननीय विधायक वार स्थिति');   
    selectData(obj, url, title, 2, 0, 'demo1', 'simpledatatable1', 'landscape');
   
}
function getWorkMLAWise(districtId, yearId, seatTypeId) {
    var obj = {};
    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }    
    
    if (seatTypeId == '') {
        obj.seatTypeId = $('#seatTypeId').val();
    } else {
        obj.seatTypeId = seatTypeId;    
    }

    obj.seatId = $('#seatId').val();
    var url = "/Main/getNikayDistrictWise";
    obj.optMode = "MLAWiseApplication";
    var name = "उत्तर प्रदेश";
    if ($('#seatTypeId').val() == "1") {
        name = "विधान सभा"
    } else if ($('#seatTypeId').val() == "2") {
        name = "विधान परिषद्"
    } else {
        name ="उत्तर प्रदेश विधान मण्डल"
    }
    
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> "+name+" के माननीय विधायक वार कार्यों की वित्तीय स्थिति";
    $('#MLAName').text('उत्तर प्रदेश के कार्यों की माननीय विधायक वार स्थिति');
    selectData(obj, url, title, 2, 0, 'demo1', 'simpledatatable1', 'landscape');
    
}
function expenseSummaryDetailsIAWise(districtId, yearId) {
    var obj = {};
    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }
    obj.seatId = $('#seatId').val();
    obj.seatTypeId = $('#seatTypeId').val();
    var url = "/Main/getNikayDistrictWise";
    obj.optMode = "expenseSummaryDetailsIAWise";
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br>  कार्यदायी संस्था वार व्यय का विवरण";
  
    selectData(obj, url, title, 2, 0, 'demo1', 'simpledatatable1', 'landscape');
    $('#divBack').show();
}

function iaWiseReport(districtId, yearId) {
    var obj = {};
    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }
    //obj.seatId = $('#seatId').val();
    //obj.seatTypeId = $('#seatTypeId').val();
    var url = "/Main/getNikayDistrictWise";
    obj.optMode = "iaWiseReport";
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br>  कार्यदायी संस्था वार व्यय का विवरण";

    selectData(obj, url, title, 2, 0, 'demo1', 'simpledatatable1', 'landscape');
    //$('#divBack').show();
}


function iaWisePhysicalReport(districtId, yearId) {
    var obj = {};
    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }
    //obj.seatId = $('#seatId').val();
    //obj.seatTypeId = $('#seatTypeId').val();
    var url = "/Main/IAWisePhysical";
    obj.optMode = "getWorkDistrictAndIAWisePhysical";
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br>  कार्यदायी संस्था वार विवरण";

    selectData(obj, url, title, 2, 0, 'demo1', 'simpledatatable1', 'landscape');
    //$('#divBack').show();
}

function dtodTransfer(districtId, yearId) {
    var obj = {};
    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }
    //obj.seatId = $('#seatId').val();
    //obj.seatTypeId = $('#seatTypeId').val();
    var url = "/Reports/dtodTransfer";
    obj.optMode = "dtodTransfer";
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br>  व्यय का विवरण";
    selectData(obj, url, title, 2, 0, 'demo1', 'simpledatatable1', 'landscape');
    //$('#divBack').show();
}


function getWorkDistrictWise(districtId,yearId) {
    var obj = {};
    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }
    //if (seatId === '') {
    //    obj.seatId = $('#seatId').val();
    //}
    //else {
    //    obj.seatId = seatId
    //}
    //if (seatTypeId === '') {
    //    obj.seatTypeId = $('#seatTypeId').val();
    //}
    //else {
    //    obj.seatTypeId = seatTypeId
    //}
    
    var url = "/Main/expenseSummaryDetailsDistrictWise";
    obj.optMode = "expenseSummaryDetailsDistrictWise";
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> जनपद वार व्यय का विवरण";
    //$('#MLAName').text('उत्तर प्रदेश के कार्यों की माननीय विधायक वार स्थिति');
    selectData(obj, url, title, 2, 0, 'demo1', 'simpledatatable1', 'landscape');
    
    $('#divBack').hide();
}


function getGrievianceDistrictWise() {
    debugger
    var obj = {};
    obj.divisionId = -1;
    obj.districtId = districtId;
    obj.yearId = $('#yearId').val();
    var url = "/Main/getGrievanceSummaryDistrictWise";
    obj.optMode = "districtWiseApplication";
    var title = "District wise Work Details";
    $('#janPadName').text('उत्तर प्रदेश के समस्त जनपद के कार्यों की स्थिति');
    $('#heading').text('उत्तर प्रदेश के समस्त जनपद के कार्यों की स्थिति');
    selectData(obj, url, title, 0, 0, 'demo', 'simpledatatable', 'landscape');
    
    $('#btnDistrictWise').hide();
    $('#btnNikayWise').hide();
    $('#districtId').val(-1);
}

function getGrievianceDistrictWise(districtId, yearId) {
    debugger
    var obj = {};
    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }
    //if (seatId === '') {
    //    obj.seatId = $('#seatId').val();
    //}
    //else {
    //    obj.seatId = seatId
    //}
    //if (seatTypeId === '') {
    //    obj.seatTypeId = $('#seatTypeId').val();
    //}
    //else {
    //    obj.seatTypeId = seatTypeId
    //}

    var url = "/Main/GrievanceSummaryDetailsDistrictWise";
    obj.optMode = "GrievanceSummaryDetailsDistrictWise";
    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> जनपद वार शिकायत का विवरण";
    //$('#MLAName').text('उत्तर प्रदेश के कार्यों की माननीय विधायक वार स्थिति');
    selectData(obj, url, title, 2, 0, 'demo1', 'simpledatatable1', 'landscape');

    $('#divBack').hide();
}

function getGrievianceDistrictWise2(districtId, yearId ) {
    var obj = {};
    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }

    if (seatTypeId == '') {
        obj.seatTypeId = $('#seatTypeId').val();
    } else {
        obj.seatTypeId = seatTypeId;
    }

    obj.seatId = $('#seatId').val();
    var url = "/Main/getGrievianceDistrictWise2";
    obj.optMode = "MLAWiseGrievanceApplication";
    var name = "उत्तर प्रदेश";
    if ($('#seatTypeId').val() == "1") {
        name = "विधान सभा"
    } else if ($('#seatTypeId').val() == "2") {
        name = "विधान परिषद्"
    } else {
        name = "उत्तर प्रदेश विधान मण्डल"
    }

    var title = "विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> " + name + " के माननीय विधायक वार कार्यों की वित्तीय स्थिति";
    $('#MLAName').text('उत्तर प्रदेश के कार्यों की माननीय विधायक वार स्थिति');
    selectData(obj, url, title, 2, 0, 'demo1', 'simpledatatable1', 'landscape');

}



function selectWorkForFirstInstallmentStatus() {
    var obj = {};
    obj.optMode = "selectWorkForFirstInstallmentStatus";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.yearId = $('#yearId').val();
    obj.districtId = $('#districtId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> Works For First Installment Status';
    var url = "/Reports/selectWorkForFirstInstallmentStatus";
    selectData(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'landscape');

}
function userProfile() {
    var obj = {};
    obj.optMode = "userProfile";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.yearId = $('#yearId').val();
    obj.districtId = $('#districtId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> User Profile';
    var url = "/Reports/userProfile";
    selectData(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'landscape');

}
function transactionLog() {
    var obj = {};
    obj.optMode = "transactionLog";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.yearId = $('#yearId').val();
    obj.districtId = $('#districtId').val();
    obj.iaId = $('#iaId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> Transaction Log';
    var url = "/Reports/transactionLog";
    selectData(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'landscape');

}
function WorkPaymentDetailsIAWISE(districtId, yearId, iaId) {
    var obj = {};
    obj.optMode = "WorkPaymentDetails";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();

    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }
    if (iaId === '') {
        obj.iaId = $('#iaId').val();
    }
    else {
        obj.iaId = iaId;
    }

    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> Work Payment Details';
    var url = "/Main/WorkPaymentDetails";
    selectData(obj, url, title, 1, 0, 'demo1', 'simpledatatable1', 'landscape');

}
function WorkPaymentDetails(districtId, yearId, iaId) {
    var obj = {};
    obj.optMode = "WorkPaymentDetails";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();

    if (districtId === '') {
        obj.districtId = $('#districtId').val();
    }
    else {
        obj.districtId = districtId;
    }
    if (yearId === '') {
        obj.yearId = $('#yearId').val();
    }
    else {
        obj.yearId = yearId;
    }
    if (iaId === '') {
        obj.iaId = $('#iaId').val();
    }
    else {
        obj.iaId = iaId;
    }
    
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> Work Payment Details';
    var url = "/Reports/WorkPaymentDetails";
    selectData(obj, url, title, 1, 0, 'demo', 'simpledatatable', 'landscape');

}

function dprDetails(applicationType) {

    var obj = {};

    obj.optMode = "getDPRDetails";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.districtId = $('#districtId').val();
    if (applicationType == '') {
        obj.applicationType = $('#applicationType').val();
    }
    obj.applicationType = applicationType;

    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> All Sanctioned Work by District and thier DPR Status';
    var url = "/Reports/dprDetails";
    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable', 'landscape');

}
function getDashboard() {

    var obj = new Object();
    debugger
    obj.districtId = $('#districtId').val();
    obj.yearId = $('#yearId').val();
    obj.seatId = $('#seatId').val();
    obj.seatTypeId = $('#seatTypeId').val();
    obj.optMode = "getDashboardGraph";
    var url = "/Main/getGraph";
    $.ajax({
        type: "Get",
        url: basePath + url,
        data: { districtId: obj.districtId, yearId: obj.yearId, optMode: obj.optMode, seatTypeId: obj.seatTypeId, seatId: obj.seatId },
        contentType: 'application/html; charset=utf-8',
        async: false,
        success: function (dataset) {
            $('#divDashboard').html(dataset);
          
        }
    });
}
function dprNotUploadedDetails() {

    var obj = {};

    obj.optMode = "dprNotUploadedDetails";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.districtId = $('#districtId').val();
    if (applicationType == '') {
        obj.applicationType = $('#applicationType').val();
    }
    obj.applicationType = applicationType;

    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> All Sanctioned Work by District and thier DPR Not Uploaded';
    var url = "/Reports/dprDetails";
    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable', 'landscape');

}
function getProposedWorkDetails(applicationType, schemeType) {
    
    var obj = {};
   
    obj.optMode = "getProposedWorkDetails";
    obj.zoneId = $('#zoneId').val();   
    obj.divisionId = $('#divisionId').val();
    obj.districtId = $('#districtId').val();
    if (applicationType == '') {
        obj.applicationType = $('#applicationType').val();
    } else {
        obj.applicationType = applicationType;
    }
   
    if (schemeType == '') {
        obj.schemeType = $('#planId').val();
    } else {
        obj.schemeType = schemeType;
    }
    obj.yearId = $('#yearId').val();
    var title = 'विधान मण्डल क्षेत्र विकास निधि योजना ,ग्राम्य विकास विभाग, उत्तर प्रदेश </br> All Work Details ';
    var url = "/Reports/getProposedWorkDetails";
    selectData(obj, url, title, 2, 0, 'demo', 'simpledatatable', 'landscape');
    
}

function BastiReport83() {
    var obj = {};
    obj.optMode = "getBastiDetails";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.districtId = $('#districtId').val();   
    var title = 'Basti wise & Anudan 83 Details ';
    var url = "/Reports/BastiReport83";
    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable', 'landscape');
}
function BastiReport37() {
    var obj = {};
    obj.optMode = "getBastiDetails";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.districtId = $('#districtId').val();
    var title = 'Basti wise & Anudan 37 Details ';
    var url = "/Reports/BastiReport37";
    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable', 'landscape');
}
function getBastiSurveyDetails() {

    var obj = {};
    obj.optMode = "getBastiSurveyDetails";
    obj.zoneId = $('#zoneId').val();
    obj.divisionId = $('#divisionId').val();
    obj.districtId = $('#districtId').val();
    var title = 'Basti wise Survey Details ';
    var url = "/Reports/bastiSurveyReport";
    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable', 'landscape');

}

function sanctionedWorkReport83() {
    var obj = {};
    obj.optMode = "getProposedWorkDetails";
    obj.zoneId = $('#zoneId').val();   
    obj.divisionId = $('#divisionId').val();
    obj.districtId = $('#districtId').val();
    obj.yearId = $('#yearId').val();
    var title = 'Sanctioned Work Details ';
    var url = "/Reports/sanctionedWorkReport83";
    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable', 'landscape');
}
function sanctionedWorkReport37() {
    var obj = {};
    obj.optMode = "getProposedWorkDetails";
    obj.zoneId = $('#zoneId').val();
    obj.schemeType = "2";
    obj.divisionId = $('#divisionId').val();
    obj.districtId = $('#districtId').val();
    var title = 'Sanctioned Work of Anudan 37 Details ';
    var url = "/Reports/sanctionedWorkReport37";
    selectData(obj, url, title, 4, 0, 'demo', 'simpledatatable', 'landscape');
}

function selectData(obj, urll,title,leftColumn,rightColumn,divName,tableName,orientation) {

    $.ajax({
        type: "POST",
        url: basePath + urll,
        contentType: 'application/json; charset=utf-8',
        //dataType: "json",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        async: false,
        success: function (dataset) {
            var arOfcolumnProperties = [];
            bindReport(300, 0, leftColumn, rightColumn, title, UserName, 0, dataset, divName, tableName, arOfcolumnProperties, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], [14], orientation);

           
        }
    });
    $('#'+divName).focus();
   // $("#simpledatatable td").addClass("customfont");
}

function selectData1(obj, urll, title, leftColumn, rightColumn, divName, tableName, orientation) {

    $.ajax({
        type: "POST",
        url: basePath + urll,
        contentType: 'application/json; charset=utf-8',
        // dataType: "json",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        async: false,
        success: function (dataset) {
            var arOfcolumnProperties = [];
            
            bindDataTableWithData(300, 0, leftColumn, rightColumn, title, UserName, 0, dataset, divName, tableName, arOfcolumnProperties, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13], [14], orientation);


        }
    });
    $('#' + divName).focus();
    // $("#simpledatatable td").addClass("customfont");
}





