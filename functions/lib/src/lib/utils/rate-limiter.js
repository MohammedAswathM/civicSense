"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isDailyReportLimitExceeded = isDailyReportLimitExceeded;
const constants_1 = require("./constants");
function isDailyReportLimitExceeded(reportCount) {
    return reportCount >= constants_1.MAX_REPORTS_PER_USER_PER_DAY;
}
