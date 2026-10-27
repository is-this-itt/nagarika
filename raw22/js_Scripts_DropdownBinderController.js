var basePath = $('#hfBasePath').val();


function bindWorkByBastiId(id, bastiId, yearId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.bastiId = bastiId;
    obj.yearId = yearId;
    obj.optMode = "bindWorkByBastiId";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "वित्तीय वर्षवार कार्य "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindUnPaidWork(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindUnPaidWork";
    
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "कार्य चुनें "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindSecondUnPaidWork(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindSecondUnPaidWork";

    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "कार्य चुनें "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindIA(id,  defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindIA";
    obj.seatTypeId = seatTypeId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "आईoएo चुनें"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindIAByDistrictId(id, districtId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindIAByDistrictId";
    obj.districtId = districtId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "आईoएo चुनें"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindTT(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindTT";
  
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Transfer To"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindMLA(id, seatTypeId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindMLA";
    obj.seatTypeId = seatTypeId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "माo विधायक चुनें"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindProposal(id,  defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindProposal";
  
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "प्रस्ताव चुनें"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindInstallment(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindInstallment";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "किश्त का प्रकार"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindSeatType(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindSeatType";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "क्षेत्र का प्रकार"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function VbindSeat(id, seatTypeId, districtId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "VbindSeat";
    obj.seatTypeId = seatTypeId;
    obj.districtId = districtId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "क्षेत्र"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindSeat(id, seatTypeId, districtId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindSeat";
    obj.seatTypeId = seatTypeId;
    obj.districtId = districtId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "क्षेत्र"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindYearType(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindYearType";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "सत्र का प्रकार"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindYear(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindYear";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "वित्तीय वर्ष  "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindElectionYear(id,seatTypeId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindElectionYear";
    if (seatTypeId == '1') {
        obj.yearTypeId = 2;
    }
    if (seatTypeId == '2') {
        obj.yearTypeId = 3;
    }
   
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: " सत्र"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindTenderStatus(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindTenderStatus";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "निविदा की स्थिति  "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindVendor(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindVendor";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Vendor "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindAllDistrict(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindAllDistrict";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "समस्त जनपद"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}


function bindAnudan(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindAnudan";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "मेंबर टाइप"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function VbindZone(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "VbindZone";
    //obj.circleId = circleId;
    //obj.divisionId = divisionId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "मंडल  "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindVidhayks(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindVidhayks";
    //obj.circleId = circleId;
    //obj.divisionId = divisionId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "यूजरनाम चुनें "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindZone(id,defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindZone";
    //obj.circleId = circleId;
    //obj.divisionId = divisionId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "मंडल  "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindBastiType(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindBastiType";
    
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "बस्ती - ग्राम - मोहल्ला का प्रकार "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindBasti(id, wardId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindBasti";
    obj.wardId = wardId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "बस्ती - ग्राम - मोहल्ला "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindCategory(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindCategory";
   
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "केटेगरी"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindCircle(id,zoneId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindCircle";
    obj.zoneId = zoneId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Circle "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindNodalDistrict(id, seatId, electionYearId, seatTypeId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindNodalDistrict";
    obj.seatId = seatId;
    obj.electionYearId = electionYearId;
    obj.seatTypeId = seatTypeId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "नोडल जनपद"
            }));
            
            $.each(Data, function (index, rowData) {
                defaultSelectionValues = rowData.id;
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindVidhayakByDistrictId(id, districtId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindVidhayakByDistrictId";
    obj.districtId = districtId;
   
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "विधायक"
            }));

            $.each(Data, function (index, rowData) {
                defaultSelectionValues = rowData.id;
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);

        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindVidhayak(id, seatId, electionYearId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindVidhayak";
    obj.seatId = seatId;
    obj.electionYearId = electionYearId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty(); 
            $.each(Data, function (index, rowData) {
                ddl.val(rowData.value);   
                
            });

                    
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindVidhayakDetailById(id, vidhayakId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindVidhayak";
    obj.vidhayakId = vidhayakId;
   
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "विधायक"
            }));

            $.each(Data, function (index, rowData) {
                defaultSelectionValues = rowData.id;
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);


        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}


function VbindDistrict(id, zoneId, circleId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "VbindDistrict";
    obj.circleId = circleId;
    obj.zoneId = zoneId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "जनपद"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindDistrict(id, zoneId,circleId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindDistrict";
    obj.circleId = circleId;
    obj.zoneId = zoneId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "जनपद  "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindDivision(id, zoneId, circleId, districtId,typeId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.zoneId = zoneId;   
    obj.districtId = districtId;
    obj.typeId = typeId;
    obj.optMode = "bindDivision";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "ब्लॉक - निकाय"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindWorkType(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindWorkType";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "कार्य का प्रकार "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}


function bindWard(id, divisionId, typeId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();   
    obj.divisionId = divisionId;
    obj.optMode = "bindWard";
    obj.typeId = typeId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "वार्ड - ग्राम पंचायत"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}


function bindDesignation(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindDesignation";
    //obj.circleId = circleId;
    //obj.divisionId = divisionId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Designation "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}
function bindGroup(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindGroup";
    //obj.circleId = circleId;
    //obj.divisionId = divisionId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Group"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindEmpoyeeCourtOrder(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindEmpoyeeCourtOrder";
    //obj.circleId = circleId;
    //obj.divisionId = divisionId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Court Order"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindEmployeeWorkTypeMaster(id, designationId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.designationId = designationId;
    obj.optMode = "bindEmployeeWorkTypeMaster";
   
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Work Type"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}


function bindDepartment(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindDepartment";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Department"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindPensionType(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindPensionType";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Pension Type"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindEmployeeType(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindEmployeeType";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Employee Type"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindOffice(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindOffice";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Office"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}


function bindProject(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindProject";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Project "
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}


function bindUsers(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '0';
    }
    var obj = new Object();
    obj.optMode = "bindUsers";


    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Friend Name"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindOutlet(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindOutletByRestaurentId";

    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Outlet"
            }));
            var first;
            $.each(Data, function (index, rowData) {
                if (index == 0) {
                    first = rowData.id;
                }
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
           
                ddl.val(defaultSelectionValues);
            
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindRole(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindRole";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();


            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(1);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindRolebyOutletId(id, outletId, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == 0 || defaultSelectionValues == '-1' || defaultSelectionValues == '') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindRole";
    obj.projectId = outletId;
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();


            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(1);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindCurrency(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == '-1' || defaultSelectionValues == '' || defaultSelectionValues == '0') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindCurrency";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Currency"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));
            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}

function bindTimeZone(id, defaultSelectionValues) {
    defaultSelectionValues = typeof defaultSelectionValues !== 'undefined' ? defaultSelectionValues : '';
    if (defaultSelectionValues == -1 || defaultSelectionValues == '-1' || defaultSelectionValues == '' || defaultSelectionValues == '0') {
        defaultSelectionValues = '-1';
    }
    var obj = new Object();
    obj.optMode = "bindTimeZone";
    $.ajax({
        type: 'POST',
        url: basePath + '/DropdownBinder/fillDropdown',
        async: false,
        contentType: "application/json; charset=utf-8",
        data: "{'obj':" + JSON.stringify(obj) + "}",
        success: function (Data) {
            var ddl = $('#' + id);
            ddl.empty();
            ddl.append($('<option/>', {
                value: "-1",
                text: "Time Zone"
            }));

            $.each(Data, function (index, rowData) {
                ddl.append($('<option/>', {
                    value: rowData.id,
                    text: rowData.value
                }));

            });
            ddl.val(defaultSelectionValues);
        },
        error: function (errorData) {
            console.log(errorData);
        }
    });

}




