function bindDataTableWithData(height, noOfColumns, leftcolumn, rightcolumn, title, message, t, e, r, i, n, a, l, orientation) {



    var o = $.parseJSON(e),
        b = o["Table_" + t],
        s = o["Col_" + t];
    0 == a.length && (a = createArrayOfRange(0, s.length - 1)), $("#" + r).html('<table id="' + i + '" class="table dt-center table-striped table-bordered  break-spaces dataTable dtr-inline collapsed" data-scroll-height="' + height + '"  data-cols-number="' + noOfColumns + '"  role="grid" aria-describedby="res-config_info"></table>'), $("#" + i).dataTable({
        aaData: b,
        dom: "Blfrtip",
        "autoWidth": true, 
        "paging": false,
         sScrollY: "50vh",
        //sScrollX: true,
        //bScrollCollapse: true,
        //columnDefs: [{
        //        targets: 1,
        //    className: 'customfont'
        //    }],
        fixedColumns: {
            leftColumns: parseInt(leftcolumn),
            rightColumns: parseInt(rightcolumn)
        },
        displayLength: 25,
        aoColumns: createJSON(s, n, a),
        buttons: [
            'copy',
            {

                //customize: function (win) {
                //    $("#simpledatatable").find('th').eq(1).addClass("customfont");
                //},                
                extend: 'excelHtml5',
                title: title,
                messageTop: message,
                exportOptions: {
                    columns: ':visible'
                }
            },
            
            {
                extend: 'print',
                title: title,
                messageTop: message,
                text: 'Print',
                autoPrint: false,
                exportOptions: {
                    columns: ':visible'
                },
                customize: function (win) {
                    $(win.document.body).css('font-size', '10pt');

                    $(win.document.body).find('table')
                        .addClass('compact')
                        .css({
                            'font-size': '15px',
                            'table-layout': 'auto',  // बाकी कॉलम का साइज़ ऑटोमैटिक होगा
                            'width': '100%'
                        });

                    // ✅ केवल 8वें कॉलम (Index 7) की Width और Text Wrap सेट करें
                    $(win.document.body).find('table tr td:nth-child(9), table tr th:nth-child(8)').css({
                        'white-space': 'normal',  // टेक्स्ट को लाइन ब्रेक करने दें
                        'word-wrap': 'break-word',  // शब्दों को सही से तोड़ें
                        'width': '300px' // केवल 8वें कॉलम के लिए Width सेट करें
                    });

                    // ✅ लैंडस्केप मोड सेट करें
                    var css = `
            @page {
                size: A4 landscape;
                margin: 10mm;
            }
        `;

                    var head = win.document.head || win.document.getElementsByTagName('head')[0];
                    var style = win.document.createElement('style');
                    style.type = 'text/css';
                    style.media = 'print';

                    if (style.styleSheet) {
                        style.styleSheet.cssText = css;
                    } else {
                        style.appendChild(win.document.createTextNode(css));
                    }

                    head.appendChild(style);

                    // ✅ 500ms की देरी से प्रिंट डायलॉग दिखाएं ताकि CSS अप्लाई हो जाए
                    setTimeout(function () {
                        win.print();
                    }, 500);
                }
            }
            , 'colvis'
        ],
        

    });
    $('.DTFC_Cloned').find('thead tr th').each(function () {
        if (($(this).html()) == '') {
            $(this).css('display', 'none');
        }
    });



}
function bindReport(height, noOfColumns, leftcolumn, rightcolumn, title, message, t, e, r, i, n, a, l, orientation) {
    var o = $.parseJSON(e),
        b = o["Table_" + t],
        s = o["Col_" + t];
    o = a.length && (a = createArrayOfRange(0, s.length - 1)), $("#" + r).html('<table id="' + i + '" class="table table-striped table-bordered nowrap dataTable no-footer dtr-inline collapsed" data-scroll-height="' + height + '"  data-cols-number="' + noOfColumns + '"></table>'), $("#" + i).dataTable({
        aaData: b,
        dom: "Blfrtip",
        sScrollY: "60vh",
        /* "autoWidth": false, */
        sScrollX: true,
        bScrollCollapse: true,
        "paging": false,
        //order: [], // Default ordering disable
        //orderFixed: [0, 'asc'], // Fix the order of the first column in ascending order

        fixedColumns: {
            leftColumns: parseInt(leftcolumn),
            rightColumns: parseInt(rightcolumn)
        },
        
        //columnDefs: [
        //    { "className": "dt-center", "targets": "_all" },
        //    {
        //        searchable: false,
        //        orderable: false,
        //        targets: 0,
        //    },
        //],
        
        /*  displayLength: 100,*/
        aoColumns: createJSON(s, n, a),
        buttons: [
             'copy',
            {
                extend: 'excelHtml5',
                title: title,
                messageTop: message,
                exportOptions: {
                    columns: ':visible'
                }
            },
            
            {
                extend: 'print',
                title: title,
                messageTop: message,
                text: 'Print',
                autoPrint: false,
                exportOptions: {
                    columns: ':visible'
                },
                customize: function (win) {
                    $(win.document.body).css('font-size', '10pt');

                    $(win.document.body).find('table')
                        .addClass('compact')
                        .css({
                            'font-size': '15px',
                            'table-layout': 'auto',  // बाकी कॉलम का साइज़ ऑटोमैटिक होगा
                            'width': '100%'
                        });

                    // ✅ केवल 8वें कॉलम (Index 7) की Width और Text Wrap सेट करें
                    $(win.document.body).find('table tr th, table tr td').css({
                        'white-space': 'normal',  // Text Wrap ऑन करें
                        'word-wrap': 'break-word',  // शब्दों को सही से तोड़ें
                        'max-width': '350px',  // हर कॉलम की मैक्सिमम चौड़ाई 250px सेट करें
                        'overflow-wrap': 'break-word'  // Extra text को सही से ब्रेक करें
                    });

                    // ✅ लैंडस्केप मोड सेट करें
                    var css = `
            @page {
                size: A4 landscape;
                margin: 10mm;
            }
        `;

                    var head = win.document.head || win.document.getElementsByTagName('head')[0];
                    var style = win.document.createElement('style');
                    style.type = 'text/css';
                    style.media = 'print';

                    if (style.styleSheet) {
                        style.styleSheet.cssText = css;
                    } else {
                        style.appendChild(win.document.createTextNode(css));
                    }

                    head.appendChild(style);

                    // ✅ 500ms की देरी से प्रिंट डायलॉग दिखाएं ताकि CSS अप्लाई हो जाए
                    setTimeout(function () {
                        win.print();
                    }, 500);
                }
            }
            , 'colvis'
            
        ]

    });

}

function createJSON(t, e, r) {
    jsonObj = [];
    for (var i = 0; i < t.length; i++)
        if (jQuery.inArray(i, r) >= 0) {
            var n = t[i].Column1,
                a = t[i].Column1,
                l = findProperty(i, e);
            item = {}, item.mData = n, "Actions" == n && (item.mRender = function (t, e, r) {
                return returnButton(r.Actions)
            }), 0 == jQuery.isEmptyObject(l) ? (item.sTitle = l[0].sTitle, item.bVisible = l[0].bVisible) : (item.sTitle = a, item.bVisible = !0), jsonObj.push(item)
        } return jsonObj;
}

function findProperty(t, e) {
    return $.grep(e, function (e, r) {
        return e.colIndex == t;
    })
}

function columnProperties(t, e, r, i) {
    return this.sTitle = e, this.colIndex = t, this.boolVisible = !(r > 0 && "" != r) || r, this.bSortable = !(i > 0 && "" != i) || i, this;
}

function createArrayOfRange(t, e) {
    for (var r = [], i = t; e >= i; i++) r.push(i);
    return r;
}

function freezerGetScrollbarWidth() {
    // Create the measurement node
    var scrollDiv = document.createElement("div");
    scrollDiv.className = "freezer-scrollbar-measure";
    document.body.appendChild(scrollDiv);

    // Get the scrollbar width
    var scrollbarWidth = scrollDiv.offsetWidth - scrollDiv.clientWidth;
    //console.warn(scrollbarWidth); // Mac: 15, Win: 17

    // Delete the DIV
    document.body.removeChild(scrollDiv);

    return scrollbarWidth;
}

function bindHTMLTable(id) {

    $('#' + id).each(function () {

        var table = $(this),
            scrollbarWidth = freezerGetScrollbarWidth();

        //prepare
        table.css({
            margin: 0
        }).addClass('table-freeze-multi-original').find('tfoot').remove();

        //wrap
        table.wrap(' <div class= "freeze-multi-scroll-wrapper" /> ');
        var wrapper = table.closest('.freeze-multi-scroll-wrapper');
        table.wrap('<div class= "freeze-multi-scroll-table" /> ');
        table.wrap('<div class= "freeze-multi-scroll-table-body" /> ');
        var scroller = wrapper.find('.freeze-multi-scroll-table-body');

        //layout
        var headblock = $('<div class= "freeze-multi-scroll-table-head-inner" /> ');
        scroller.before($('<div class= "freeze-multi-scroll-table-head" /> ').append(headblock));
        var topblock = $('<div class= "freeze-multi-scroll-left-head" /> ');
        var leftblock = $('<div class= "freeze-multi-scroll-left-body-inner" /> ');
        wrapper.append($('<div class= "freeze-multi-scroll-left" /> ')
            .append(topblock)
            .append($('<div class= "freeze-multi-scroll-left-body" /> ').append(leftblock)));

        //cloning
        var clone = table.clone(true);
        clone.addClass('table-freeze-multi-clone').removeClass('table-freeze-multi-original');
        var colsNumber = table.data('colsNumber') || table.find('tbody tr:first th').length;
        //head
        var cloneHead = clone.clone(true);
        cloneHead.find('tbody').remove();
        headblock.append(cloneHead);
        //top
        var cloneTop = cloneHead.clone(true);
        topblock.append(cloneTop);
        //left
        var cloneLeft = clone.clone(true);
        cloneLeft.find('thead').remove();
        leftblock.append(cloneLeft);

        //sizing
        var scrollHeight = table.data('scrollHeight') || wrapper.parent().closest('*').height();
        var headerHeight = table.find('thead').height();
        var leftWidth = (function () {
            var w = 0;
            table.find('tbody tr:first > *').slice(0, colsNumber).each(function () {
                w = w + $(this).outerWidth();
            });
            return w + 1;
        }());
        wrapper.css('height', scrollHeight);
        scroller.css('max-height', scrollHeight - headblock.height());
        headblock.width(table.width()).css('padding-right', scrollbarWidth);
        leftblock.add(leftblock.parent()).height(scrollHeight - scrollbarWidth - headerHeight);
        leftblock.width(leftWidth + scrollbarWidth);
        wrapper.find('.freeze-multi-scroll-left').width(leftWidth);

        //postprocess
        wrapper.find('.table-freeze-multi-original thead').hide();

        //scrolling
        scroller.on('scroll', function () {
            var s = $(this),
                left = s.scrollLeft(),
                top = s.scrollTop();
            headblock.css('transform', 'translate(' + (-1 * left) + 'px, 0)');
            leftblock.scrollTop(top);
        });
        leftblock.on('mousewheel', false);

    });


    var colgroup = $('<colgroup></colgroup>'); // Create a new <colgroup> element
    var colCount = $('#' + id + ' tbody tr:eq(0) td').length;
    for (var i = 0; i < colCount; i++) {
        colgroup.append('<col>'); // Add a <col> element to the <colgroup> element
    }
    $('#' + id + ' thead').before(colgroup); // Insert the <colgroup> element before the <thead> element

    var n = 2; // change n to the number of td elements you want to convert to th elements
    $('#' + id + ' tbody tr').each(function () {
        $('td', this).slice(0, n).each(function () {
            $(this).replaceWith('<th>' + $(this).text() + '</th>');
        });
    });


}

// /path/to/custom-footer.js
// Function to add a footer with totals to a DataTable
// /path/to/custom-fixed-footer.js
// Function to add a footer with totals to a DataTable, supporting fixed columns
