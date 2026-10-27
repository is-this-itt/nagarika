
function ddmmToMMdd(date) {
   
    var d = new Date(date.split("/").reverse().join("-"));
    var dd = ("0" + (d.getDate())).slice(-2);
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var yy = d.getFullYear();
    var newdate = mm + "/" + dd + "/" + yy;
    return newdate;
    
   
}

function mmddToddMM(date) {
    var d = new Date(date.split("/").join("-"));
    var dd = ("0" + (d.getDate())).slice(-2);
    var mm = ("0" + (d.getMonth() + 1)).slice(-2);
    var yy = d.getFullYear();
    var newdate = dd + "/" + mm + "/" + yy;
    return newdate;
}


function checkValidPan(ctrlId) {
    var str = $('#' + ctrlId).val();
    var msg = "";
    var i = true;
    if ((!((/^[a-z]+$/i).test(str.charAt(0))) && str.length == 1)) {
        msg = "First Letter should be Character Like CJVPK8755L |3";
        //c
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }
    else if ((!((/^[a-z]+$/i).test(str.charAt(1))) && str.length == 2)) {
        msg = "Second Letter should be Character Like CJVPK8755L |3";
        //j
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }
    else if ((!((/^[a-z]+$/i).test(str.charAt(2))) && str.length == 3)) {
        msg = "Third Letter should be Character Like CJVPK8755L |3";
        //v
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }
    else if ((!((/^[a-z]+$/i).test(str.charAt(3))) && str.length == 4)) {
        msg = "Fourth Letter should be Character Like CJVPK8755L |3";
        //p
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }
    else if ((!((/^[a-z]+$/i).test(str.charAt(4))) && str.length == 5)) {
        msg = "Fivth Letter should be Character Like CJVPK8755L |3";
        //k
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }

    else if ((!((/^\d+$/).test(str.charAt(5))) && str.length == 6)) {
        msg = "Sixth Letter should be Number Like CJVPK8755L |3";
        //9
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }
    else if ((!((/^\d+$/).test(str.charAt(6))) && str.length == 7)) {
        msg = "Seventh Letter should be Number Like CJVPK8755L |3";
        //8
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }
    else if ((!((/^\d+$/).test(str.charAt(7))) && str.length == 8)) {
        msg = "Eighth Letter should be Number Like CJVPK8755L |3";
        //5
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }
    else if ((!((/^\d+$/).test(str.charAt(8))) && str.length == 9)) {
        msg = "Ninth Letter should be Number Like CJVPK8755L |3";
        //0
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }

    else if ((!((/^[a-z]+$/i).test(str.charAt(9))) && str.length == 10)) {
        msg = "Tenth Letter should be Character Like CJVPK8755L |3";
        //L
        showMessage(msg);
        $('#' + ctrlId).focus();
        return false;
    }
    else {
        return true;
    }


}

function checkAdhar(ctrlId) {
    var adhar = $('#' + ctrlId).val();
    var msg = '';
        var regex = /^([0-9]{4}[0-9]{4}[0-9]{4}$)|([0-9]{4}\s[0-9]{4}\s[0-9]{4}$)|([0-9]{4}-[0-9]{4}-[0-9]{4}$)/;
    if (regex.test(adhar)) {
            //$("#lblError").css("visibility", "hidden");
        } else {
        msg="Invalid Adhaar Format|2"
        showMessage(msg);
        $('#' + ctrlId).focus();
        $('#' + ctrlId).val('');
        }
    
}
$('.numberonly').keypress(function (e) {

    var charCode = (e.which) ? e.which : event.keyCode

    if (String.fromCharCode(charCode).match(/[^0-9]/g))

        return false;

});   


function chnageinWord(ctrl) {
    
    var a = convertNumberToWords($(ctrl).val());
    $(ctrl).parent().find('span').remove();
    var b = '<span style="color:#800000">' + a + '</span>'
    $(ctrl).parent().append(b);
}


function numberToWords(number) {
    var digit = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine'];
    var elevenSeries = ['ten', 'eleven', 'twelve', 'thirteen', 'fourteen', 'fifteen', 'sixteen', 'seventeen', 'eighteen', 'nineteen'];
    var countingByTens = ['twenty', 'thirty', 'forty', 'fifty', 'sixty', 'seventy', 'eighty', 'ninety'];
    var shortScale = ['', 'thousand', 'million', 'billion', 'trillion'];

    number = number.toString(); number = number.replace(/[\, ]/g, ''); if (number != parseFloat(number)) return 'not a number'; var x = number.indexOf('.'); if (x == -1) x = number.length; if (x > 15) return 'too big'; var n = number.split(''); var str = ''; var sk = 0; for (var i = 0; i < x; i++) { if ((x - i) % 3 == 2) { if (n[i] == '1') { str += elevenSeries[Number(n[i + 1])] + ' '; i++; sk = 1; } else if (n[i] != 0) { str += countingByTens[n[i] - 2] + ' '; sk = 1; } } else if (n[i] != 0) { str += digit[n[i]] + ' '; if ((x - i) % 3 == 0) str += 'hundred '; sk = 1; } if ((x - i) % 3 == 1) { if (sk) str += shortScale[(x - i - 1) / 3] + ' '; sk = 0; } } if (x != number.length) { var y = number.length; str += 'point '; for (var i = x + 1; i < y; i++) str += digit[n[i]] + ' '; } str = str.replace(/\number+/g, ' '); return str.trim() + " ";

} 

function convertNumberToWords(num) {
    var ones = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
    var tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
    if ((num = num.toString()).length > 9) return "Overflow: Maximum 9 digits supported";
    n = ("000000000" + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return;
    var str = "";
    str += n[1] != 0 ? (ones[Number(n[1])] || tens[n[1][0]] + " " + ones[n[1][1]]) + "Crore " : "";
    str += n[2] != 0 ? (ones[Number(n[2])] || tens[n[2][0]] + " " + ones[n[2][1]]) + "Lakh " : "";
    str += n[3] != 0 ? (ones[Number(n[3])] || tens[n[3][0]] + " " + ones[n[3][1]]) + "Thousand " : "";
    str += n[4] != 0 ? (ones[Number(n[4])] || tens[n[4][0]] + " " + ones[n[4][1]]) + "Hundred " : "";
    str += n[5] != 0 ? (str != "" ? "and " : "") + (ones[Number(n[5])] || tens[n[5][0]] + " " + ones[n[5][1]]) : "";
    return str;
}

function formatNumberInHindi(number) {
    var wordsMap = {
        0: 'शून्य',
        1: 'एक',
        2: 'दो',
        3: 'तीन',
        4: 'चार',
        5: 'पांच',
        6: 'छह',
        7: 'सात',
        8: 'आठ',
        9: 'नौ',
        10: 'दस',
        11: 'ग्यारह',
        12: 'बारह',
        13: 'तेरह',
        14: 'चौदह',
        15: 'पंद्रह',
        16: 'सोलह',
        17: 'सत्रह',
        18: 'अठारह',
        19: 'उन्नीस',
        20: 'बीस',
        30: 'तीस',
        40: 'चालीस',
        50: 'पचास',
        60: 'साठ',
        70: 'सत्तर',
        80: 'अस्सी',
        90: 'नव्व्यानवे',
        100: 'सौ',
        1000: 'हज़ार',
        100000: 'लाख',
        10000000: 'करोड़',
        1000000000: 'अरब',
        100000000000: 'खरब'
    };

    function convertToWords(number) {
        if (number < 20) {
            return wordsMap[number];
        }

        if (number < 100) {
            var tens = Math.floor(number / 10) * 10;
            var units = number % 10;
            if (units === 0) {
                return wordsMap[tens];
            } else {
                return wordsMap[tens] + ' ' + wordsMap[units];
            }
        }

        if (number < 1000) {
            var hundreds = Math.floor(number / 100);
            var remainder = number % 100;
            if (remainder === 0) {
                return wordsMap[hundreds] + ' ' + wordsMap[100];
            } else {
                return wordsMap[hundreds] + ' ' + wordsMap[100] + ' ' + convertToWords(remainder);
            }
        }

        for (var key in wordsMap) {
            if (wordsMap.hasOwnProperty(key)) {
                var value = wordsMap[key];
                if (number < key) {
                    var baseUnit = Math.floor(number / (key / 1000));
                    var remainderUnit = number % (key / 1000);
                    if (remainderUnit === 0) {
                        return convertToWords(baseUnit) + ' ' + value;
                    } else {
                        return convertToWords(baseUnit) + ' ' + value + ' ' + convertToWords(remainderUnit);
                    }
                }
            }
        }
    }

    var formattedNumber = convertToWords(number);
    return formattedNumber;
}

function getUniqueNumberByDatetime() {
    var datetime = new Date();
    var uniqueNumber = datetime.getTime();
    return uniqueNumber;
}


function formatAmountWithColumns(amount) {
    // रूपरेखा के लिए बाईं से दाईं ओर पठनीय स्तंभ संख्या
    var columnNumbers = [2, 1, 0];
    var columnSeparator = ','; // स्तंभ विभाजक

    var formattedAmount = amount.toLocaleString('en-IN'); // भारतीय मुद्रा स्वरूप में राशि का स्थानीय स्तरण
    var amountParts = formattedAmount.split('.'); // डेसिमल से अलग करें
    var wholePart = amountParts[0]; // पूर्णांक भाग
    var decimalPart = amountParts[1] ? amountParts[1] : ''; // दशमलव भाग (अगर है)

    // स्तंभ में भाग को विभाजित करें
    var formattedWholePart = '';
    for (var i = 0; i < wholePart.length; i++) {
        var digit = wholePart.charAt(i);
        formattedWholePart += digit;
        if (columnNumbers.includes(wholePart.length - i - 1)) {
            formattedWholePart += columnSeparator;
        }
    }

    // संपूर्ण राशि को फ़ॉर्मेट करें
    var formattedAmountWithColumns = formattedWholePart;
    if (decimalPart !== '') {
        formattedAmountWithColumns += '.' + decimalPart;
    }

    return formattedAmountWithColumns;
}


function showMessage(message) {
    var messageAr = message.split('|');
    var msgText = messageAr[0];
    var msgType = messageAr[1];  
    toastr.options = {
        "closeButton": false,
        "debug": false,
        "positionClass": "toast-top-center",
        "onclick": null,
        "showDuration": "200",
        "hideDuration": "1500",
        "timeOut": "6000",
        "extendedTimeOut": "1200",
        "showEasing": "swing",
        "hideEasing": "linear",
        "showMethod": "fadeIn",
        "hideMethod": "fadeOut"
    }
    if (msgType == "1") {
        toastr.success(msgText, 'Success');
    }
    else if (msgType == "2") {
        toastr.info(msgText, 'Info');
    }
    else if (msgType == "3") {
        toastr.warning(msgText, 'Warning');
    }
    else {
        toastr.error(msgText, 'Error');
    }

}

//function validateForm([], [], [], [], [], [], [], [], [], [], [], [])
//{
//    return true;
//}
function validateForm(rValidateT, rValidateD, rValidateE, rValidateS, rValidateU, formID, rValidateChecked, rValidateRadio, rValidatefile, rValidateDate, rValidateEmail, rValidateMobile) {

    //rValidateT //For TextBox
    //rValidateD //For DropDown
    //rValidateE //For HtmlEditor
    //rValidateS //For Two date comparison fromdate pass first,todate pass later
    //rValidateU //For Unknown
    //rValidateChecked //For Checkbox but you should provide name
    //rValidateRadio //For Radio but you should provide name
    //rValidatefile //For File upload
    //rValidateEmail //For Email
    //*******************Input******************************
    required = rValidateT; //For Text B
    errornotice = $("#error");
    emptyerror = "Required";
    var msg = '';
    var focussed = 0;
    for (i = 0; i < required.length; i++) {
        var input = $('#' + required[i]);
        if (($.trim(input.val()) == "") || ($.trim(input.val()) == emptyerror)) {
            $(input).closest('div').removeClass('has-success');
            $(input).closest('div').addClass('has-error');
            $(input).siblings('label').addClass('control-label');
            $(input).addClass("form-control invalid");
        } else {
            $(input).closest('div').removeClass('has-error');
            $(input).closest('div').addClass('has-success');
            $(input).siblings('label').addClass('control-label');
            $(input).removeClass("invalid");
            $(input).addClass("form-control valid");
        }
    }

    $(":input[type=text]").focus(function () {
        if ($(this).hasClass("invalid")) {
            $(this).val("");
            $(this).removeClass("invalid");
            $(this).addClass("valid");
            $(input).closest('div').removeClass('has-error');
            $(input).closest('div').addClass('has-success');


        }
    });
    $(":input[type=text]").focusout(function () {
        if ($(this).hasClass("valid")) {
            if ($(this).val() == "") {
                $(this).removeClass("valid");
                $(this).addClass("invalid");
                $(this).closest('div').removeClass('has-success');
                $(this).closest('div').addClass('has-error');
            }

        }
    });
    //*******************End Input Validation******************************
    //*******************Start Email Validation******************************
    var emailCheck = rValidateEmail; //For Text B
    var mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    for (i = 0; i < emailCheck.length; i++) {
        var emailsingle = $('#' + emailCheck[i]);
        $(emailsingle).addClass("Email");

    }
    $(".Email").focusout(function () {

        if ($(this).val() != "") {
            if (mailRegex.test($(this).val()) == false) {
                $(this).val('');
                $(this).attr("placeholder", "Enter Valid Email-id");
            }
        }

    });


    //*******************End Email Validation******************************

    //*******************Start Mobile  Validation******************************
    var contactRegex = /^\+?\d[\d -]{8,12}\d$/;
    var contactCheck = rValidateMobile;
    for (i = 0; i < contactCheck.length; i++) {
        var contasingle = $('#' + contactCheck[i]);
        $(contasingle).addClass("mob");

    }
    $(".mob").focusout(function () {
        if ($(this).val() != "") {
            if (contactRegex.test($(this).val()) == false) {
                $(this).val('');
                $(this).attr("placeholder", "Enter Valid Contact no.");
                $(this).focus();
            }
        }

    });
    //*******************End Mobile  Validation******************************
    //*******************Start Date Validation******************************
    var dateRegex = /^(?=\d)(?:(?:31(?!.(?:0?[2469]|11))|(?:30|29)(?!.0?2)|29(?=.0?2.(?:(?:(?:1[6-9]|[2-9]\d)?(?:0[48]|[2468][048]|[13579][26])|(?:(?:16|[2468][048]|[3579][26])00)))(?:\x20|$))|(?:2[0-8]|1\d|0?[1-9]))([-.\/])(?:1[012]|0?[1-9])\1(?:1[6-9]|[2-9]\d)?\d\d(?:(?=\x20\d)\x20|$))?(((0?[1-9]|1[012])(:[0-5]\d){0,2}(\x20[AP]M))|([01]\d|2[0-3])(:[0-5]\d){1,2})?$/;
    var rDate = rValidateDate; //For Text B
    for (i = 0; i < rDate.length; i++) {
        var rinputDate = $('#' + rDate[i]);
        if (dateRegex.test(rinputDate.val()) == false) {
            $(rinputDate).closest('label').addClass('input state-error');
            $(rinputDate).addClass("invalid");
        } else {
            $(rinputDate).closest('label').removeClass('input state-error');
            $(rinputDate).closest('label').addClass('input state-success');
            $(rinputDate).removeClass("invalid");
            $(rinputDate).addClass("valid");
        }
    }

    $(".hasDatepicker").focus(function () {
        if ($(this).hasClass("invalid")) {
            $(this).val("");
            $(this).removeClass("invalid");
            $(this).addClass("valid");
            $(this).closest('label').removeClass('label input state-error');
            $(this).closest('label').addClass('label input state-success');

        }
    });
    $(".hasDatepicker ").focusout(function () {
        if ($(this).hasClass("valid")) {
            if ($(this).val() == "") {
                $(this).removeClass("valid");
                $(this).addClass("invalid");
                $(this).closest('label').removeClass('label input state-success');
                $(this).closest('label').addClass('label input state-error');
            }

        }
    });
    //*******************Input******************************

    //************************Select******************************
    option = rValidateD;
    for (i = 0; i < option.length; i++) {
        var select = $('#' + option[i]);

        if (select.val() == "-1" || select.val() == "") {
            $(select).closest('div').removeClass('has-success');
            $(select).siblings('label').addClass(' control-label');
            $(select).closest('div').addClass('has-error');
            $(select).addClass("invalid");
        } else {

            $(select).closest('div').removeClass('has-error');
            $(select).closest('div').addClass('has-success');
            $(select).siblings('label').addClass(' control-label');
            $(select).removeClass("invalid");
            $(select).addClass("valid");

        }
    }

    $('select').focus(function () {

        if ($(this).hasClass("invalid")) {
            if ($(this).val() == "-1" || $(this).val() == "") {

                $(this).removeClass("invalid");
                $(this).addClass("valid");
                $(this).siblings('label').addClass(' control-label');
                $(this).closest('div').removeClass('has-error');
                $(this).closest('div').addClass('has-success');
            }
        }
    });
    $('select').focusout(function () {
        if ($(this).hasClass("valid")) {
            if ($(this).val() == "-1" || $(this).val() == "") {
                $(this).removeClass("valid");
                $(this).addClass("invalid");
                $(this).closest('div').removeClass('has-success');
                $(this).closest('div').addClass('has-error');
            }

        }
    });
    //************************Select******************************

    //************************Start File Upload******************************
    var files = rValidatefile;
    for (i = 0; i < files.length; i++) {
        var input = $('#' + files[i]);
        if (($.trim(input.val()) == "") || ($.trim(input.val()) == emptyerror)) {
            $(input).closest('div').removeClass('input input-file state-success');
            $(input).closest('div').addClass('input input-file state-error');
            $(input).addClass("invalid");
        } else {
            $(input).closest('div').removeClass('input input-file state-error');
            $(input).closest('div').addClass('input input-file state-success');
            $(input).removeClass("invalid");
            $(input).addClass("valid");
        }
    }

    $(':file').focus(function () {
        if ($(this).hasClass("invalid")) {
            if ($(this).val() == "-1" || $(this).val() == "") {

                $(this).removeClass("invalid");
                $(this).addClass("valid");
                $(this).closest('div').removeClass('input input-file state-error');
                $(this).closest('div').addClass('input input-file state-success');
            }
        }
    });
    $(':file').focusout(function () {
        if ($(this).hasClass("valid")) {
            if ($(this).val() == "-1" || $(this).val() == "") {
                $(this).removeClass("valid");
                $(this).addClass("invalid");
                $(this).closest('div').removeClass('input input-file state-success');
                $(this).closest('div').addClass('input  input-file state-error');
            }

        }
    });
    //************************End File Upload******************************


    //*********************Checkbox***********************************
    var rd = rValidateChecked;
    for (i = 0; i < rd.length; i++) {
        var rdb = $('input[name=' + rd[i] + ']');
        var rdbChecked = $('input[name=' + rd[i] + ']:checked');
        if (rdbChecked.length <= 0) {
            $(rdb).closest('label').removeClass('checkbox state-success');
            $(rdb).closest('label').addClass('checkbox state-error');
            $(rdb).addClass("invalid");
        } else {
            $(rdb).closest('label').removeClass('checkbox state-error');
            $(rdb).closest('label').addClass('checkbox state-success');
            $(rdb).removeClass("invalid");
            $(rdb).addClass("valid");

        }
    }

    $(':input[type=checkbox].invalid').change(function () {
        var i = 0;
        $(':input[type=checkbox]').each(function () {

            if ($(this).is(':checked')) {
                i = i + 1;
            }
        });
        if (i > 0) {
            $(':input[type=checkbox]').each(function () {
                $(this).removeClass("invalid");
                $(this).addClass("valid");
                $(this).closest('label').removeClass('label checkbox state-error');
                $(this).closest('label').addClass('label checkbox state-success');
            });
        }
        else {
            $(':input[type=checkbox]').each(function () {
                $(this).removeClass("valid");
                $(this).addClass("invalid");
                $(this).closest('label').removeClass('label checkbox state-success');
                $(this).closest('label').addClass('label checkbox state-error');
            });
        }
    });


    //**********************End Checkbox***********************************


    //*********************Radio***********************************
    var radioButton = rValidateRadio;
    for (i = 0; i < radioButton.length; i++) {
        var rdbInde = $('input[name=' + radioButton[i] + ']');
        var rdbChecked = $('input[name=' + radioButton[i] + ']:checked');
        if (rdbChecked.length <= 0) {
            $(rdbInde).closest('label').removeClass('radio state-success');
            $(rdbInde).closest('label').addClass('radio state-error');
            $(rdbInde).addClass("invalid");
        } else {
            $(rdbInde).closest('label').removeClass('radio state-error');
            $(rdbInde).closest('label').addClass('radio state-success');
            $(rdbInde).removeClass("invalid");
            $(rdbInde).addClass("valid");

        }
    }

    $(':input[type=radio].invalid').change(function () {
        var i = 0;
        $(':input[type=radio]').each(function () {

            if ($(this).is(':radio')) {
                i = i + 1;
            }
        });
        if (i > 0) {
            $(':input[type=radio]').each(function () {
                $(this).removeClass("invalid");
                $(this).addClass("valid");
                $(this).closest('label').removeClass('label radio state-error');
                $(this).closest('label').addClass('label radio state-success');
            });
        }
        else {
            $(':input[type=radio]').each(function () {
                $(this).removeClass("valid");
                $(this).addClass("invalid");
                $(this).closest('label').removeClass('label radio state-success');
                $(this).closest('label').addClass('label radio state-error');
            });
        }
    });


    //**********************End Checkbox***********************************


    $('textarea').focus(function () {
        if ($(this).hasClass("invalid")) {
            $(this).val("");
            $(this).removeClass("invalid");
            $(this).addClass("valid");
            $(this).closest('label').removeClass('label input state-error');
            $(this).closest('label').addClass('label input state-success');

        }
    });
    $('textarea').focusout(function () {
        if ($(this).hasClass("valid")) {
            if ($(this).val() == "") {
                $(this).removeClass("valid");
                $(this).addClass("invalid");
                $(this).closest('label').removeClass('label input state-success');
                $(this).closest('label').addClass('label input state-error');
            }

        }
    });




    if ($(":input").filter(':visible').hasClass("invalid")) {

        $(".has-error:first").closest('div').offset().top - 250
        //if ($(".has-error:first").parents().eq(0)[0].children[1]["localName"] == 'label') {
        //    window.scrollTo(0, $(".state-error:first").closest('label').offset().top - 250);
        //}
        //else {
        //    window.scrollTo(0, $(".state-error:first").closest('div').offset().top - 250);
        //}

        return false;
    } else {

        return true;
    }
}

function checkMail(controlId) {
    var mailRegex = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if ($('#' + controlId).val() !== "") {
        if (mailRegex.test($('#' + controlId).val()) === false) {
            $('#' + controlId).val('');
            $('#' + controlId).attr("placeholder", "Enter Valid Email-id");
            showMessage("Enter Valid Email-id|2")
        }
    }

}

function IsNumeric(e) {
    var keyCode = e.which ? e.which : e.keyCode4
    var ret = ((keyCode >= 48 && keyCode <= 57) || specialKeys.indexOf(keyCode) != -1);
    if (ret == false)
        return false;
}
function IsAlphanumericWithSpecialCharacter(character) {// dash(-)
    if (!/^[a-zA-Z0-9\-]*$/g.test(character.trim())) {
        //alertify.error("Scheme Name should be alphanumeric (with '-', '\' and '/' characters)");
        return false;
    } return true;
}
function IsAlphabetWithSpace(character) {
    if (!/^[a-zA-Z ]*$/g.test(character.trim())) {
        //alertify.error("Scheme Name should be alphanumeric (with '-', '\' and '/' characters)");
        return false;
    } return true;
}
function IsAlphanumeric(character) {
    if (!/^[a-zA-Z0-9]*$/g.test(character.trim())) {
        //alertify.error("Scheme Name should be alphanumeric");
        return false;
    } return true;
}

function returnButton(buttonVal) {
    //structureToCreateButton 
    //Send -1  if onclick function not required

    ///submit,Edit,name,value,title,onclick|
    var allButtons = buttonVal.split('|')
    var postType = '';
    var buttonType = '';
    var name = '';
    var svalue = '';
    var title = '';
    var onClickFun = '';
    var s = "";
    var enableDisable = "1";
    $.each(allButtons, function (index, value) {
        var vals = value.split('~');
        postType = vals[0];
        buttonType = vals[1];
        name = vals[2];
        svalue = vals[3];
        title = vals[4];
        onClickFun = vals[5];
        enableDisable = vals[6];
        var props = "";
        if (vals.length > 6) {
            props = vals[7];
        }
        buttonType = typeof buttonType !== 'undefined' ? buttonType : '-1';
        if (buttonType != '-1') {
            if (enableDisable == "0") {
                if (buttonType.toLowerCase() == "edit")
                    buttonType = '><i class="fas fa-pen"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "communication")
                    buttonType = '><i class="fa fa-comments"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "delete")
                    buttonType = '><i class="fa fa-times"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "confirm")
                    buttonType = '><i class="fa fa-check"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "history")
                    buttonType = '><i class="fa fa-history"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "reject")
                    buttonType = '><i class="fa fa-power-off "  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "user")
                    buttonType = '><i class="fa fa-user "  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "reset")
                    buttonType = '><i class="fa fa-cog "  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "view")
                    buttonType = '><i class="fa fa-eye"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "resetPassword")
                    buttonType = '><i class="fa fa-lock "  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "print")
                    buttonType = '><i class="fa fa-print"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "nc")
                    buttonType = '><i class="fa fa-flask"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "sync")
                    buttonType = '><i class="fa fa-sync"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "benkosh")
                    buttonType = '><i class="fa fa-undo"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "pending")
                    buttonType = '><i class="fa fa-clock"  style="color:red"></i></button>';

            }
            else {
                if (buttonType.toLowerCase() == "edit")
                    buttonType = '><i class="fas fa-pen"></i> </button>';
                else if (buttonType.toLowerCase() == "communication")
                    buttonType = '><i class="fa fa-comments"  ></i></button>';
                else if (buttonType.toLowerCase() == "delete")
                    buttonType = '><i class="fa fa-times" ></i></button>';
                else if (buttonType.toLowerCase() == "confirm")
                    buttonType = '><i class="fa fa-check" ></i></button>';
                else if (buttonType.toLowerCase() == "history")
                    buttonType = '><i class="fa fa-history" ></i></button>';
                else if (buttonType.toLowerCase() == "reject")
                    buttonType = '><i class="fa fa-power-off "></i></button>';
                else if (buttonType.toLowerCase() == "user")
                    buttonType = '><i class="fa fa-user " ></i></button>';
                else if (buttonType.toLowerCase() == "reset")
                    buttonType = '><i class="fa fa-cog "  ></i></button>';
                else if (buttonType.toLowerCase() == "view")
                    buttonType = '><i class="fa fa-eye"></i></button>';
                else if (buttonType.toLowerCase() == "resetPassword")
                    buttonType = '><i class="fa fa-lock "   ></i></button>';
                else if (buttonType.toLowerCase() == "print")
                    buttonType = '><i class="fa fa-print"   ></i></button>';
                else if (buttonType.toLowerCase() == "nc")
                    buttonType = '><i class="fa fa-flask"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "sync")
                    buttonType = '><i class="fa fa-sync"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "benkosh")
                    buttonType = '><i class="fa fa-undo"  style="color:red"></i></button>';
                else if (buttonType.toLowerCase() == "pending")
                    buttonType = '><i class="fa fa-clock"  style="color:red"></i></button>';
            }



            s = s = s + '<button class="btn btn-outline-info " style="margin-left:2px" title="' + $.trim(title) + '" type="' + $.trim(postType) + '"  data-original-title="' + $.trim(title) + '" value=' + $.trim(svalue) + '   name="' + $.trim(name) + '"';
            if (onClickFun != "-1") {
                s = s + ' onclick=' + $.trim(onClickFun) + '';
            }
            if (props != "") {
                s = s + ' ' + props;
            }

            if (enableDisable == "0") {
                s = s + ' disabled '
            }
            s = s + buttonType;
        }
    });
    return s;
}


function resetFormWithId(formID) {
    $("#" + formID).find('input:text, input:password, input:file, textarea').val('');
    $("#" + formID).find('select').val('-1');
    $("#" + formID).find('input:radio, input:checkbox').prop('checked', false).prop('selected', false);
    $("#" + formID).find('input:text, input:password, input:file, select, textarea')
}


(function ($) {
    /*
     * Allows only valid characters to be entered into input boxes.
     * Note: fixes value when pasting via Ctrl+V, but not when using the mouse to paste
      *      side-effect: Ctrl+A does not work, though you can still use the mouse to select (or double-click to select all)
     *
     * @name     numeric
     * @param    config      { decimal : "." , negative : true }
     * @param    callback     A function that runs if the number is not valid (fires onblur)
     * @author   Sam Collett (http://www.texotela.co.uk)
     * @example  $(".numeric").numeric();
     * @example  $(".numeric").numeric(","); // use , as separator
     * @example  $(".numeric").numeric({ decimal : "," }); // use , as separator
     * @example  $(".numeric").numeric({ negative : false }); // do not allow negative values
     * @example  $(".numeric").numeric(null, callback); // use default values, pass on the 'callback' function
     * @example  $(".numeric").numeric({ scale: 2 }); // allow only two numbers after the decimal point.
     * @example  $(".numeric").numeric({ scale: 0 }); // Same as $(".numeric").numeric({ decimal : false });
     * @example  $(".numeric").numeric({ precision: 2 }); // allow only two numbers.
     * @example  $(".numeric").numeric({ precision: 4, scale: 2 }); // allow four numbers with two decimals. (99.99)
     *
     */
    $.fn.numeric = function (config, callback) {
        if (typeof config === 'boolean') {
            config = { decimal: config };
        }
        config = config || {};
        // if config.negative undefined, set to true (default is to allow negative numbers)
        if (typeof config.negative == "undefined") { config.negative = true; }
        // set decimal point
        var decimal = (config.decimal === false) ? "" : config.decimal || ".";
        // allow negatives
        var negative = (config.negative === true) ? true : false;
        // callback function
        callback = (typeof (callback) == "function" ? callback : function () { });
        // scale
        var scale;
        if ((typeof config.scale) == "number") {
            if (config.scale == 0) {
                decimal = false;
                scale = -1;
            }
            else
                scale = config.scale;
        }
        else
            scale = -1;
        // precision
        var precision;
        if ((typeof config.precision) == "number") {
            precision = config.precision;
        }
        else
            precision = 0;
        // set data and methods
        return this.data("numeric.decimal", decimal).data("numeric.negative", negative).data("numeric.callback", callback).data("numeric.scale", scale).data("numeric.precision", precision).keypress($.fn.numeric.keypress).keyup($.fn.numeric.keyup).blur($.fn.numeric.blur);
    };

    $.fn.numeric.keypress = function (e) {
        // get decimal character and determine if negatives are allowed
        var decimal = $.data(this, "numeric.decimal");
        var negative = $.data(this, "numeric.negative");
        // get the key that was pressed
        var key = e.charCode ? e.charCode : e.keyCode ? e.keyCode : 0;
        // allow enter/return key (only when in an input box)
        if (key == 13 && this.nodeName.toLowerCase() == "input") {
            return true;
        }
        else if (key == 13) {
            return false;
        }
        var allow = false;
        // allow Ctrl+A
        if ((e.ctrlKey && key == 97 /* firefox */) || (e.ctrlKey && key == 65) /* opera */) { return true; }
        // allow Ctrl+X (cut)
        if ((e.ctrlKey && key == 120 /* firefox */) || (e.ctrlKey && key == 88) /* opera */) { return true; }
        // allow Ctrl+C (copy)
        if ((e.ctrlKey && key == 99 /* firefox */) || (e.ctrlKey && key == 67) /* opera */) { return true; }
        // allow Ctrl+Z (undo)
        if ((e.ctrlKey && key == 122 /* firefox */) || (e.ctrlKey && key == 90) /* opera */) { return true; }
        // allow or deny Ctrl+V (paste), Shift+Ins
        if ((e.ctrlKey && key == 118 /* firefox */) || (e.ctrlKey && key == 86) /* opera */ ||
            (e.shiftKey && key == 45)) { return true; }
        // if a number was not pressed
        if (key < 48 || key > 57) {
            var value = $(this).val();
            /* '-' only allowed at start and if negative numbers allowed */
            if (value.indexOf("-") !== 0 && negative && key == 45 && (value.length === 0 || parseInt($.fn.getSelectionStart(this), 10) === 0)) { return true; }
            /* only one decimal separator allowed */
            if (decimal && key == decimal.charCodeAt(0) && value.indexOf(decimal) != -1) {
                allow = false;
            }
            // check for other keys that have special purposes
            if (
                key != 8 /* backspace */ &&
                key != 9 /* tab */ &&
                key != 13 /* enter */ &&
                key != 35 /* end */ &&
                key != 36 /* home */ &&
                key != 37 /* left */ &&
                key != 39 /* right */ &&
                key != 46 /* del */
            ) {
                allow = false;
            }
            else {
                // for detecting special keys (listed above)
                // IE does not support 'charCode' and ignores them in keypress anyway
                if (typeof e.charCode != "undefined") {
                    // special keys have 'keyCode' and 'which' the same (e.g. backspace)
                    if (e.keyCode == e.which && e.which !== 0) {
                        allow = true;
                        // . and delete share the same code, don't allow . (will be set to true later if it is the decimal point)
                        if (e.which == 46) { allow = false; }
                    }
                    // or keyCode != 0 and 'charCode'/'which' = 0
                    else if (e.keyCode !== 0 && e.charCode === 0 && e.which === 0) {
                        allow = true;
                    }
                }
            }
            // if key pressed is the decimal and it is not already in the field
            if (decimal && key == decimal.charCodeAt(0)) {
                if (value.indexOf(decimal) == -1) {
                    allow = true;
                }
                else {
                    allow = false;
                }
            }
        }
        //if a number key was pressed.
        else {
            // If scale >= 0, make sure there's only <scale> characters
            // after the decimal point.
            if ($.data(this, "numeric.scale") >= 0) {
                var decimalPosition = this.value.indexOf(decimal);
                //If there is a decimal.
                if (decimalPosition >= 0) {
                    decimalsQuantity = this.value.length - decimalPosition - 1;
                    //If the cursor is after the decimal.
                    if ($.fn.getSelectionStart(this) > decimalPosition)
                        allow = decimalsQuantity < $.data(this, "numeric.scale");
                    else {
                        integersQuantity = (this.value.length - 1) - decimalsQuantity;
                        //If precision > 0, integers and decimals quantity should not be greater than precision
                        if (integersQuantity < ($.data(this, "numeric.precision") - $.data(this, "numeric.scale")))
                            allow = true;
                        else
                            allow = false;
                    }
                }
                //If there is no decimal
                else {
                    if ($.data(this, "numeric.precision") > 0)
                        allow = this.value.replace($.data(this, "numeric.decimal"), "").length < $.data(this, "numeric.precision") - $.data(this, "numeric.scale");
                    else
                        allow = true;
                }
            }
            else
                // If precision > 0, make sure there's not more digits than precision
                if ($.data(this, "numeric.precision") > 0)
                    allow = this.value.replace($.data(this, "numeric.decimal"), "").length < $.data(this, "numeric.precision");
                else
                    allow = true;
        }
        return allow;
    };

    $.fn.numeric.keyup = function (e) {
        var val = $(this).val();
        if (val && val.length > 0) {
            // get carat (cursor) position
            var carat = $.fn.getSelectionStart(this);
            // get decimal character and determine if negatives are allowed
            var decimal = $.data(this, "numeric.decimal");
            var negative = $.data(this, "numeric.negative");

            // prepend a 0 if necessary
            if (decimal !== "" && decimal !== null) {
                // find decimal point
                var dot = val.indexOf(decimal);
                // if dot at start, add 0 before
                if (dot === 0) {
                    this.value = "0" + val;
                }
                // if dot at position 1, check if there is a - symbol before it
                if (dot == 1 && val.charAt(0) == "-") {
                    this.value = "-0" + val.substring(1);
                }
                val = this.value;
            }

            // if pasted in, only allow the following characters
            var validChars = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, '-', decimal];
            // get length of the value (to loop through)
            var length = val.length;
            // loop backwards (to prevent going out of bounds)
            for (var i = length - 1; i >= 0; i--) {
                var ch = val.charAt(i);
                // remove '-' if it is in the wrong place
                if (i !== 0 && ch == "-") {
                    val = val.substring(0, i) + val.substring(i + 1);
                }
                // remove character if it is at the start, a '-' and negatives aren't allowed
                else if (i === 0 && !negative && ch == "-") {
                    val = val.substring(1);
                }
                var validChar = false;
                // loop through validChars
                for (var j = 0; j < validChars.length; j++) {
                    // if it is valid, break out the loop
                    if (ch == validChars[j]) {
                        validChar = true;
                        break;
                    }
                }
                // if not a valid character, or a space, remove
                if (!validChar || ch == " ") {
                    val = val.substring(0, i) + val.substring(i + 1);
                }
            }
            // remove extra decimal characters
            var firstDecimal = val.indexOf(decimal);
            if (firstDecimal > 0) {
                for (var k = length - 1; k > firstDecimal; k--) {
                    var chch = val.charAt(k);
                    // remove decimal character
                    if (chch == decimal) {
                        val = val.substring(0, k) + val.substring(k + 1);
                    }
                }
                // remove numbers after the decimal so that scale matches.
                if ($.data(this, "numeric.scale") >= 0)
                    val = val.substring(0, firstDecimal + $.data(this, "numeric.scale") + 1);
                // remove numbers so that precision matches.
                if ($.data(this, "numeric.precision") > 0)
                    val = val.substring(0, $.data(this, "numeric.precision") + 1);
            }
            // limite the integers quantity, necessary when user delete decimal separator
            else if ($.data(this, "numeric.precision") > 0)
                val = val.substring(0, ($.data(this, "numeric.precision") - $.data(this, "numeric.scale")));

            // set the value and prevent the cursor moving to the end
            this.value = val;
            $.fn.setSelection(this, carat);
        }
    };

    $.fn.numeric.blur = function () {
        var decimal = $.data(this, "numeric.decimal");
        var callback = $.data(this, "numeric.callback");
        var val = this.value;
        if (val !== "") {
            var re = new RegExp("^\\d+$|^\\d*" + decimal + "\\d+$");
            if (!re.exec(val)) {
                callback.apply(this);
            }
        }
    };

    $.fn.removeNumeric = function () {
        return this.data("numeric.decimal", null).data("numeric.negative", null).data("numeric.callback", null).unbind("keypress", $.fn.numeric.keypress).unbind("blur", $.fn.numeric.blur);
    };

    // Based on code from http://javascript.nwbox.com/cursor_position/ (Diego Perini <dperini@nwbox.com>)
    $.fn.getSelectionStart = function (o) {
        if (o.createTextRange) {
            var r = document.selection.createRange().duplicate();
            r.moveEnd('character', o.value.length);
            if (r.text === '') { return o.value.length; }
            return o.value.lastIndexOf(r.text);
        } else { return o.selectionStart; }
    };

    // set the selection, o is the object (input), p is the position ([start, end] or just start)
    $.fn.setSelection = function (o, p) {
        // if p is number, start and end are the same
        if (typeof p == "number") { p = [p, p]; }
        // only set if p is an array of length 2
        if (p && p.constructor == Array && p.length == 2) {
            if (o.createTextRange) {
                var r = o.createTextRange();
                r.collapse(true);
                r.moveStart('character', p[0]);
                r.moveEnd('character', p[1]);
                r.select();
            }
            else if (o.setSelectionRange) {
                o.focus();
                o.setSelectionRange(p[0], p[1]);
            }
        }
    };

})(jQuery);

$(".numeric").numeric({ decimal: ".", negative: false, scale: 3 });