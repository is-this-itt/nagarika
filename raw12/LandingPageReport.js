ï»¿const searchObj = {
    DistrictId: 0,
    ConstituencyId: 0,
    MlaId: 0,
    FinancialYear: new Date().getFullYear(),
    ExtSearch: ""

}
function OnDistrictChange() {
    const districtId = GetValueInInt("lpDistrict");
    if (districtId > 0) {
        // fill mla list
        FillCashCadingDropDownWithSelectedValue("lpMla", "/Masters/Ajax/GetMLAList?districtId=" + districtId, null, "Select  MLA Name", "0");
        // fill constituency list
        FillCashCadingDropDownWithSelectedValue("lpConstituency", "/Masters/Ajax/GetConstituencyList?districtId=" + districtId, null, "Select Constituency", "0");
    } else {
        ClearDDWithDefaultValue();
    }
}
function OnMlaNameOrConstituencyChange(isMlaId) {
    const _value = GetValueInInt(isMlaId ? "lpConstituency" : "lpMla");
    $.ajax({
        url: '/Masters/Ajax/GetMLAOrConstituencyId',
        type: 'POST',
        contentType: 'application/x-www-form-urlencoded',
        dataType: "json",
        data: {
            mlaId: isMlaId == true ? 0 : _value,
            constituencyId: isMlaId == true ? _value : 0
        },
        headers: {
            'RequestVerificationToken': $('input[name="__RequestVerificationToken"]').val()
        },
        success: function (data) {
            const _id = parseInt(data);
            if (isMlaId) {
                if ($("#lpMla option[value='" + _id + "']").length > 0) {
                    SetValue("lpMla", _id);
                } else {
                    SetValue("lpMla", 0);
                }
            } else {
                if ($("#lpConstituency option[value='" + _id + "']").length > 0) {
                    SetValue("lpConstituency", _id);
                } else {
                    SetValue("lpConstituency", 0);
                }
            }
        },
        error: function (xhr, ajaxOptions, thrownError) {
            console.error('Error ', thrownError);
        }
    });
}
function GetSearchParms() {
    searchObj.DistrictId = GetValueInInt("lpDistrict");
    searchObj.FinancialYear = GetValueInInt("lpFy");
    searchObj.ConstituencyId = GetValueInInt("lpConstituency");
    searchObj.MlaId = GetValueInInt("lpMla");
    searchObj.ExtSearch = GetValue("lpSearch");
    if (IsNullOrEmpty(searchObj.ExtSearch)) {
        searchObj.ExtSearch = "";
    }
    return searchObj;
}
function ClearDDWithDefaultValue() {
    $("#lpMla").empty();
    $("#lpMla").append('<option value="0">Select  MLA Name</option>');
    $("#lpConstituency").empty();
    $("#lpConstituency").append('<option value="0">Select Constituency</option>');
}
function OnSearchClick() {
    $('#myDataTable').DataTable().ajax.reload();
}
function OnResetClick() {
    let maxVal = Math.max(...$('#lpFy option').map(function () {
        return parseFloat(this.value) || 0; // Convert value to number, default to 0 if not a number
    }).get());
    SetValue("lpSearch", "");
    SetValue("lpFy", maxVal);
    SetValue("lpDistrict", 0);
    ClearDDWithDefaultValue();
    $('#myDataTable').DataTable().ajax.reload();
}
$(document).ready(function () {
    var table = $('#myDataTable').DataTable({
        "dom": "rtip",

        columnDefs: [
            { orderable: false, targets: 0 },
            { orderable: false, targets: 10 },
        ],
        scrollCollapse: true,
        scrollX: true,
        fixedColumns: {
            leftColumns: 0,
            rightColumns: 1
        },
        "language": {
            "infoFiltered": "",
            "zeroRecords": "No data available in the table",
            "emptyTable": "No data available in the table"
        },
        columns: [
            { 'data': 'rowNumber' },
            { 'data': 'financialYear' },
            { 'data': 'districtName' },
            { 'data': 'constituencyName' },
            { 'data': 'fullName' },
            { 'data': 'letterNo' },
            { 'data': 'strRecommendationDate' },
            {
                'data': 'recommendationAmount',
                render: function (data) {
                    return `<div style="text-align:end;padding-right: 50%">${data.toFixed(2)}</div>`;
                }
            },
            { 'data': 'projectId' },
            { 'data': 'workDescription' },
            {
                'data': 'workStatus',
                render: function (data) {
                    let div = "";
                    switch (data.toUpperCase()) {

                        case "IN PROGRESS":
                            div = `<span class="inprogress">In Progress</span>`;
                            break;
                        case "NOT STARTED":
                            div = ` <span class="notstarted">Not Started</span>`;
                            break;
                        case "COMPLETED":
                            div = `<span class="completed">Completed</span>`;
                            break;
                        default:
                            if (data.toUpperCase().indexOf("PEND") >= 0) {
                                div = `<span class="inprogress">In Progress</span>`;
                            } else {
                                div = `<span class="inprogress">${data}</span>`;
                            }
                            break;
                    }
                    return div;
                }
            }

        ],
        bServerSide: true,
        ajax: {
            url: '/MIS/MISReport/GetMLAWiseRecommendedWorkDetailsReport',
            type: 'GET',
            data: function (parm) {
                const inputParms = GetSearchParms();
                parm.DistrictId = inputParms.DistrictId;
                parm.FinancialYear = inputParms.FinancialYear;
                parm.ConstituencyId = inputParms.ConstituencyId;
                parm.MlaId = inputParms.MlaId;
                parm.ExtSearch = inputParms.ExtSearch;
                return parm;
            }
        }
    });
    table.on('draw', function () {
        let firstRow = table.row(0).data();
        if (firstRow != null && firstRow != undefined) {
            $("#lpTotalCount").html(firstRow.totalCount);
            $("#lpTotalAmt").html("â¹ " + firstRow.grandRecommendationAmount + " Lakh");
        } else {
            $("#lpTotalCount").html(0);
            $("#lpTotalAmt").html("0");
        }
    });
});
function GetValueInInt(id) {
    try {
        const value = $("#" + id).val();
        if (value === undefined || value === null || value === '' || isNaN(value)) {
            return 0;
        }
        return parseInt(value);
    } catch {
        return 0;
    }
}
function GetValue(id) {
    return $("#" + id).val();
}
function IsNullOrEmpty(value) {
    if (value != "" && value != null && value != undefined && value != '') {
        return false;
    } else {
        return true;
    }
}
function SetValue(id, value) {
    $("#" + id).val(value);
}
function FillCashCadingDropDownWithSelectedValue(CachCadeChildID, url, IsIDString, DefaultText, SelectedValue) {
    GetDataFromAjax(url).done(function (data) {
        DropdownRefreshWithSelectedValue(data, CachCadeChildID, IsIDString, DefaultText, SelectedValue);
    });
};
function DropdownRefreshWithSelectedValue(data, myCtrlID, IsIDString, DefaultText, SelectedValue) {
    var myCtrl = $("#" + myCtrlID);
    myCtrl.empty(); // Clear existing options
    myCtrl.append($('<option/>', { value: "0", text: DefaultText })); // Adding Default Text
    $.each(data, function (index, item) {
        if (IsIDString) {
            myCtrl.append($('<option/>', { value: item.idStr, text: item.displayText }));
        } else {
            myCtrl.append($('<option/>', { value: item.id, text: item.displayText }));
        }
    });
    myCtrl.val(SelectedValue);
    //if (SelectedValue != '') { myCtrl.isValid(); } else { myCtrl.isInvalid(); }
}
function GetDataFromAjax(url) {
    return $.ajax({
        url: url,
        method: "GET",
        dataType: "json"
    });
};