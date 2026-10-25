ï»¿/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   newlocalization.js  v2  â  SELECTOR-BASED, ZERO HTML CHANGES
   âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   APPROACH
   ââââââââ
   The original v1 relied on cusl-* CSS marker classes being present
   on each translatable element in the HTML.  The new _NewLayout /
   _NewHeader / _NewFooter markup does NOT have those classes, so
   translation was silently skipped.

   v2 solves this with a SELECTOR MAP: a plain JS array that maps
   each JSON key to the element(s) it translates, identified by the
   element's EXISTING selectors (class, id, href, onclick text, or
   DOM position).  No .cshtml changes are required.

   DUAL-MODE for backward compatibility
   âââââââââââââââââââââââââââââââââââââ
   1. SELECTOR MAP  (new)  â handles _NewLayout, _NewHeader, _NewFooter
                             and Index.cshtml without any HTML changes.
   2. JSON CLASS SCAN (kept) â original behaviour: any element that
      already carries a cusl-* CSS class (inner pages, banner slides)
      is still translated as before.

   ICON-SAFE TEXT REPLACEMENT
   ââââââââââââââââââââââââââ
   Many nav links have the shape <a><i class="bi-..."></i>Text</a>.
   Using jQuery's .text() would erase the <i> tag.  The mode
   'textnode' replaces only bare text nodes, leaving child elements
   (icons, <strong>, etc.) untouched.

   mode: 'text'     â $(el).text(val)   â safe for plain-text elements
   mode: 'textnode' â replaces only text nodes, <i> icons survive
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

'use strict';

var localizationData = {};

/* ââ CGF page guard (unchanged) ââââââââââââââââââââââââââââââââââââ */
function isCgfPage() {
    return window.location.href.toLowerCase().includes('cgf') || window.DomainSchemeId === 2;
}

/* ââ Replace only text nodes inside $el; child elements are untouched â
   Preserves any leading whitespace the original text node had.       */
function applyTextNodes($el, text) {
    $el.each(function () {
        $(this).contents().filter(function () {
            // Skip whitespace-only text nodes (e.g. the newline before an <i> icon).
            // Replacing those as well causes the translation to appear twice â
            // once before the icon and once after it.
            return this.nodeType === 3 && this.nodeValue.trim() !== '';
        }).each(function () {
            var ws = this.nodeValue.match(/^\s*/)[0]; // preserve leading whitespace
            this.nodeValue = ws + text;
        });
    });
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   SELECTOR MAP
   Each entry: { key, sel, mode }
     key  â key from localization.json
     sel  â jQuery selector targeting the element in _NewLayout markup
     mode â 'text' or 'textnode' (see above)
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
var SELECTOR_MAP = [

    /* ââ Topbar âââââââââââââââââââââââââââââââââââââââââââââââââââ */
    // Phone: <a href="tel:..."><i></i>TEXT</a>  â  textnode keeps icon
    // Topbar phone comes from CMS (Header > Top Menu Elements), so it must not be overwritten
    // from localization.json â that was pinning it to the old hardcoded 0674-2390336.
    // { key: 'cusln-tb-ph',       sel: '#topbar a[href^="tel"]',               mode: 'textnode' },

    /* ââ Header / CM block ââââââââââââââââââââââââââââââââââââââââ */
    // CMS-driven (Header > Menu Bar Elements) â must not be overwritten from localization.json.
    // { key: 'cusln-tb-1',        sel: '.cm-name',                             mode: 'text'     },
    // CMS-driven (Header > Menu Bar Elements) â must not be overwritten from localization.json.
    // { key: 'cusln-tb-2',        sel: '.cm-title',                            mode: 'text'     },

    /* ââ Brand text block âââââââââââââââââââââââââââââââââââââââââ */
    { key: 'cusln-tb-3',        sel: '.bt-main',                             mode: 'text'     },
    { key: 'cusln-tb-4',        sel: '.bt-sub1',                             mode: 'text'     },
    { key: 'cusln-tb-5',        sel: '.bt-sub2',                             mode: 'text'     },

    /* ââ Font-size buttons (onclick attribute uniquely identifies)  */
    { key: 'cusl-fonta-minus',  sel: '.font-btn[onclick*="(-1)"]',           mode: 'text'     },
    { key: 'cusl-fonta-normal', sel: '.font-btn[onclick*="(0)"]',            mode: 'text'     },
    { key: 'cusl-fonta-plus',   sel: '.font-btn[onclick*="(1)"]',            mode: 'text'     },

    /* ââ Login button: <a><i></i>Login</a>  â  textnode keeps icon  */
    // CMS-driven (Header > Menu Bar Elements) â must not be overwritten from localization.json.
    // { key: 'cusl-login',        sel: '.btn-topbar-login',                    mode: 'textnode' },

    /* Header menu is CMS-driven (CMS > Menu). Both languages come from the CMS columns
       MenuText / OdiaMenuText, emitted as data-en / data-od by _NewHeader.cshtml and
       applied by applyCmsText() below, so renaming a menu in CMS shows up immediately. */
    // /* ââ Navbar links â href uniquely identifies each link ââââââââ */
    // { key: 'cusl-mb-20',        sel: 'a.nav-link[href*="/IPMS/Index"]',      mode: 'textnode' },
    // { key: 'cusl-mb-19',        sel: 'a.nav-link[href*="/IPMS/AboutUs"]',    mode: 'textnode' },
    // { key: 'cusl-mb-21',        sel: 'a.nav-link[href*="/IPMS/Gallery"]',    mode: 'textnode' },
    // { key: 'cusl-mb-24',        sel: 'a.nav-link[href*="/IPMS/ContactUs"]',  mode: 'textnode' },
    // { key: 'cusl-mb-54',        sel: 'a.nav-link[href*="MLAs.pdf"]',         mode: 'textnode' },

    // /* Dropdown PARENT toggles â by DOM position (1st and 2nd .dropdown) */
    // { key: 'cusl-mb-parent-22', sel: '#mainNav .nav-item.dropdown:eq(0) > .nav-link', mode: 'textnode' },
    // { key: 'cusl-mb-parent-47', sel: '#mainNav .nav-item.dropdown:eq(1) > .nav-link', mode: 'textnode' },

    // /* Dropdown ITEMS â href uniquely identifies each item */
    // { key: 'cusl-mb-child-23',  sel: '.dropdown-item[href*="/IPMS/Report"]:not([href*="Legacy"])', mode: 'textnode' },
    // { key: 'cusl-mb-child-52',  sel: '.dropdown-item[href*="/IPMS/LegacyReport"]',                 mode: 'textnode' },
    // { key: 'cusl-mb-child-48',  sel: '.dropdown-item[href*="/IPMS/Guidelines"]',                   mode: 'textnode' },
    // { key: 'cusl-mb-child-49',  sel: '.dropdown-item[href*="/IPMS/SOP"]',                          mode: 'textnode' },
    // { key: 'cusl-mb-child-circ', sel: '.dropdown-item[href*="/IPMS/NewsEventsView"]', mode: 'textnode' },
    // { key: 'cusl-mb-child-fr', sel: '#mainNav .nav-item.dropdown:eq(1) .dropdown-item[href="#"]', mode: 'textnode' },
    /* ââ Important Links section heading ââââââââââââââââââââââââââ */
    { key: 'cusl-impl-h',   sel: '#important-links .section-title',    mode: 'text' },
    // Subtitle "Key government portals and partner organisations"
    // JSON key cusl-bsh-12 exists but the <p> has no matching CSS class,
    // so applyJsonClasses() never finds it â the selector map fills that gap.
    { key: 'cusl-bsh-12',  sel: '#important-links .section-subtitle', mode: 'text' },

    /* ââ Footer contact details âââââââââââââââââââââââââââââââââââ */
    // li:nth-child(1) = address row, li:nth-child(2) = phone row
    // span:last-child = the text span (second span, after the icon span)    
    { key: 'cusl-ft-about', sel: '#footer .footer-about', mode: 'text' },
    { key: 'cusl-ft-mob', sel: '#footer .footer-heading:eq(0)', mode: 'text' },
    { key: 'cusl-ft-res', sel: '#footer .footer-heading:eq(1)', mode: 'text' },
    { key: 'cusl-ft-cu', sel: '#footer .footer-heading:eq(2)', mode: 'text' },
    { key: 'cusl-ft-android', sel: '#footer .qr-title', mode: 'textnode' },
    { key: 'cusl-ft-gplay', sel: '#footer .playstore-link', mode: 'textnode' },
    // CMS-driven now (CMS > Menu, IsFooter) â handled by applyCmsText().
    // { key: 'cusl-ft-guide', sel: '#footer a[href*="/IPMS/Guidelines"]', mode: 'text' },
    // CMS-driven now (CMS > Menu, IsFooter) â handled by applyCmsText().
    // { key: 'cusl-ft-sop', sel: '#footer a[href*="/IPMS/SOP"]', mode: 'text' },
    // CMS-driven now (CMS > Menu, IsFooter) â handled by applyCmsText().
    // { key: 'cusl-ft-circ', sel: '#footer a[href*="/IPMS/NewsEventsView"]', mode: 'text' },
    // CMS-driven now (CMS > Menu, IsFooter) â handled by applyCmsText().
    // { key: 'cusl-ft-ir', sel: '#footer a[href*="/IPMS/LegacyReport"]', mode: 'text' },
    // CMS-driven (CMS > Footer) â must not be overwritten from localization.json.
    // { key: 'cusl-ft-ltext', sel: '#footer .footer-contact li:nth-child(1) span:last-child', mode: 'text' },
    // Footer phone also comes from CMS (Footer settings) â same reason as cusln-tb-ph above.
    // { key: 'cusl-ft-ph', sel: '#footer .footer-contact li:nth-child(2) span:last-child', mode: 'text' },
    // CMS-driven (CMS > Footer) â must not be overwritten from localization.json.
    // { key: 'cusl-ft-cpr', sel: '#footer .copyright-bar > span:first-child', mode: 'text' },
    /* ââ News Ticker âââââââââââââââââââââââââââââââââââââââââââââââ */
    // Label: <div class="ticker-label"><i></i>Latest News</div>
    { key: 'cusl-ln-h',         sel: '.ticker-label',                        mode: 'textnode' },
    // Items by position.  Items 4-7 are the CSS-scroll-loop duplicates.
    // { key: 'cusl-ln-24',        sel: '.ticker-item:eq(0)',                   mode: 'text' },   // CMS-driven now (CMS > Landing Page > Latest News)
    // { key: 'cusl-ln-11',        sel: '.ticker-item:eq(1)',                   mode: 'text' },   // CMS-driven now (CMS > Landing Page > Latest News)
    // { key: 'cusl-ln-49',        sel: '.ticker-item:eq(2)',                   mode: 'text' },   // CMS-driven now (CMS > Landing Page > Latest News)
    // { key: 'cusl-ln-45',        sel: '.ticker-item:eq(3)',                   mode: 'text' },   // CMS-driven now (CMS > Landing Page > Latest News)
    // { key: 'cusl-ln-24',        sel: '.ticker-item:eq(4)',                   mode: 'text' },   // CMS-driven now (CMS > Landing Page > Latest News)
    // { key: 'cusl-ln-11',        sel: '.ticker-item:eq(5)',                   mode: 'text' },   // CMS-driven now (CMS > Landing Page > Latest News)
    // { key: 'cusl-ln-49',        sel: '.ticker-item:eq(6)',                   mode: 'text' },   // CMS-driven now (CMS > Landing Page > Latest News)
    // { key: 'cusl-ln-45',        sel: '.ticker-item:eq(7)',                   mode: 'text' },   // CMS-driven now (CMS > Landing Page > Latest News)

    /* ââ Hero Stats Bar (bottom of hero section) âââââââââââââââââââââ
       "Financial Year" and "Select to filter data" sit inside the FY
       card as unstyled divs (no id/class) â targeted by DOM position.
       The stat labels (.hsb-lbl) are targeted via the sibling ID on
       their .hsb-num partner: #statSanctioned ~ .hsb-lbl etc.
       âââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
    // FY card header label  ("Financial Year")
    { key: 'cusl-hs-fy',  sel: '#heroStats .hsb-fy-card > div:first-child > div:first-child', mode: 'text' },
    // FY card footer label  ("Select to filter data")
    { key: 'cusl-hs-ft',  sel: '#heroStats .hsb-fy-card > div:first-child > div:last-child',  mode: 'text' },
    // Stat-card labels â targeted via sibling relationship with their numbered value divs
    { key: 'cusl-hs-ps',  sel: '#statSanctioned ~ .hsb-lbl',  mode: 'text' },
    { key: 'cusl-hs-pc',  sel: '#statCompleted  ~ .hsb-lbl',  mode: 'text' },
    { key: 'cusl-hs-sa',  sel: '#statAmount     ~ .hsb-lbl',  mode: 'text' },
    { key: 'cusl-hs-ut',  sel: '#statConst      ~ .hsb-lbl',  mode: 'text' },

    /* ââ About Us section âââââââââââââââââââââââââââââââââââââââââââ */
    // Eyebrow: <p class="ac-eyebrow"><i></i>About Us</p>
    { key: 'cusl-au-h',         sel: '.ac-eyebrow',                          mode: 'textnode' },
    // Headline accent span: <h2>...<span>Local Area Development Scheme</span></h2>
    { key: 'cusl-au-desc',      sel: '.ac-headline span',                    mode: 'text'     },
    // Body paragraphs
    // CMS-driven (CMS > Landing Page > About Us) â handled by applyCmsText().
    // { key: 'cusl-au-p1',        sel: '.about-body:eq(0)',                    mode: 'text'     },
    // CMS-driven (CMS > Landing Page > About Us) â handled by applyCmsText().
    // { key: 'cusl-au-p2',        sel: '.about-body:eq(1)',                    mode: 'text'     },
    // Know More button: <a class="btn-knowmore">Know More <i></i></a>
    // CMS-driven (CMS > Landing Page > About Us) â handled by applyCmsText().
    // { key: 'cusl-au-rm',        sel: '.btn-knowmore',                        mode: 'textnode' },
    // Stat-card labels â keys added to localization.json (cusl-au-mla/dist/est)
    { key: 'cusl-au-mla',       sel: '#about .ac-stat-card:eq(0) .key',     mode: 'text'     },
    { key: 'cusl-au-dist',      sel: '#about .ac-stat-card:eq(1) .key',     mode: 'text'     },
    { key: 'cusl-au-est',       sel: '#about .ac-stat-card:eq(2) .key',     mode: 'text'     },

    /* ââ Stats section ââââââââââââââââââââââââââââââââââââââââââââââ */
    { key: 'cusl-sd-h',         sel: '#stats .section-title',                mode: 'text' },
    { key: 'cusl-sd-desc',      sel: '#stats .section-subtitle',             mode: 'text' },
    // Two .stats-title-block elements in order (legacy data, new scheme)
    { key: 'cusl-sd-lgh',       sel: '#stats .stats-title-block:eq(0) h3',   mode: 'text' },
    { key: 'cusl-sd-lgdesc',    sel: '#stats .stats-title-block:eq(0) p',    mode: 'text' },
    { key: 'cusl-sd-h2',        sel: '#stats .stats-title-block:eq(1) h3',   mode: 'text' },
    { key: 'cusl-sd-h2desc',    sel: '#stats .stats-title-block:eq(1) p',    mode: 'text' },
    // Stat-badge label divs â targeted via sibling of the value <div id="...">
    // HTML: <div> <div class="val" id="legacySanctionAmt">...</div>
    //              <div class="key">Sanctioned Amount</div> </div>
    { key: 'cusl-sd-sa',        sel: '#legacySanctionAmt ~ .key, #newSanctionAmt ~ .key', mode: 'text' },
    { key: 'cusl-sd-exi',       sel: '#legacyAvailAmt ~ .key,   #newAvailAmt ~ .key',     mode: 'text' },
    // Chart-toggle buttons â onclick text contains "switchBarView" + "fy"/"dist"
    // Matches both the legacy and new-scheme toggles at once
    { key: 'cusl-sd-sch1',      sel: 'button[onclick*="switchBarView"][onclick*="fy"]',   mode: 'text' },
    { key: 'cusl-sd-sch2',      sel: 'button[onclick*="switchBarView"][onclick*="dist"]', mode: 'text' },

    /* ââ News & Events section ââââââââââââââââââââââââââââââââââââââ */
    { key: 'cusl-ne-h',         sel: '#news .section-title',                 mode: 'text' },
    { key: 'cusl-ne-desc', sel: '#news .section-subtitle', mode: 'text' },
    { key: 'cusl-ne-prev', sel: 'button[onclick="newsPage(-1)"]', mode: 'textnode' },
    { key: 'cusl-ne-next', sel: 'button[onclick="newsPage(1)"]', mode: 'textnode' },
];

/* ââ Apply the SELECTOR_MAP for one language ââ */
function applySelectors(lang) {
    SELECTOR_MAP.forEach(function (entry) {
        var obj  = localizationData[entry.key];
        if (!obj) return;
        var text = obj[lang];
        if (text === undefined || text === null) return;

        var $el = $(entry.sel);
        if (!$el.length) return;

        if (entry.mode === 'textnode') {
            applyTextNodes($el, text);
        } else {
            $el.text(text);
        }
    });
}

/* ââ Original JSON class scan â kept for backward compat ââââââââââââ
   Translates any element whose CSS class matches a JSON key.
   Still handles:  cusl-data banner slides (data-heading/subheading),
                   any inner page that does carry cusl-* marker classes.  */
/* Any element the views render with data-en / data-od takes its text straight from the
   CMS (header menu, About Us paragraphs, Know More button). Nothing here is hardcoded. */
function applyCmsText(lang) {
    $('[data-en]').each(function () {
        var $a = $(this);
        var txt = (lang === 'od' && $a.attr('data-od')) ? $a.attr('data-od') : $a.attr('data-en');
        if (txt) { applyTextNodes($a, txt); }
    });
}

function applyJsonClasses(lang) {
    /* These keys share their DOM element with a server-rendered date or
       visitor count. Calling .text() on them would wipe that value.
       They are handled exclusively by fixCopyrightLabels() instead.   */
    var SKIP_KEYS = ['cusl-ft-luo', 'cusl-ft-vh'];

    $.each(localizationData, function (className, translationObj) {
        if (SKIP_KEYS.indexOf(className) !== -1) return; // skip â handled separately
        var $elements = $('.' + className);
        $elements.each(function () {
            if ($(this).hasClass('cusl-data')) {
                if (translationObj[lang]) {
                    if (className.startsWith('cusl-bh')) {
                        $(this).attr('data-heading', translationObj[lang]);
                    } else if (className.startsWith('cusl-bsh')) {
                        $(this).attr('data-subheading', translationObj[lang]);
                    }
                }
            } else {
                $(this).text(translationObj[lang] || '');
            }
        });
    });
}

/* ââ News-event slider language filter (unchanged) ââ */
function showLatestNews(lang) {
    $('[class^="ipms-latestnews-"]').hide();
    $('.ipms-latestnews-' + lang).show();
}

/* ââ Chart placeholder image swap (unchanged) ââ */
function UpdateIndexChartNoDataImage() {
    var lang = $('.lang-select').val();
    var html = $('#MLAstackchartPlaceholder').html();
    var isEn = html === '<img src="/landingpage/images/no-project2.png" id="mlastackchart" alt="No data available" style="width:100%;">';
    var isOd = html === '<img src="/landingpage/images/no-data-chart-odia.png" id="mlastackchart" alt="No data available" style="width:100%;">';
    if (isEn || isOd) {
        if (lang === 'od') {
            $('#mlapiechart').attr('src', '/landingpage/images/no-data-odia.png');
            $('#mlastackchart').attr('src', '/landingpage/images/no-data-chart-odia.png');
        } else {
            $('#mlapiechart').attr('src', '/landingpage/images/no-project1.png');
            $('#mlastackchart').attr('src', '/landingpage/images/no-project2.png');
        }
    }
}

/* ââ Keep every .lang-select dropdown in sync ââ */
function syncLangSelects(lang) {
    $('.lang-select').each(function () {
        if ($(this).val() !== lang) $(this).val(lang);
    });
}

/* ââ Fix: About Us h2 heading text-node âââââââââââââââââââââââââââââ
   The <h2 class="ac-headline"> contains TWO parts:
     TextNode("Members of Legislative Assembly ")  â before the span
     <span>Local Area Development Scheme</span>    â translated via SELECTOR_MAP

   The text-node has no separate JSON key so the SELECTOR_MAP never
   touched it.  Strategy: clear it in Odia mode so only the translated
   span (full Odia name in accent colour) is visible; restore in English.
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
var ABOUT_HEADLINE_EN = 'Members of Legislative Assembly ';

function fixAboutHeading(lang) {
    var $h2 = $('.ac-headline');
    if (!$h2.length) return;
    $h2.contents().filter(function () {
        return this.nodeType === 3 && this.nodeValue.trim() !== '';
    }).each(function () {
        this.nodeValue = (lang === 'en') ? ABOUT_HEADLINE_EN : '';
    });
}

function fixStatCardLabels() { /* removed â now handled via localization.json + SELECTOR_MAP */ }

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   NUMBER CONVERSION â English â Odia digits
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   convertPageNumbers(lang) does a full DOM sweep via TreeWalker to
   convert every visible digit on the page in one pass.

   A MutationObserver keeps dynamic content in sync while Odia mode
   is active â covering counter animations (requestAnimationFrame),
   AJAX-filled values, and any JS-driven text updates.

   Skipped entirely: <script>, <style>, <canvas>, <input>,
   <textarea>, <option>, and anything inside a <select> (so the
   lang/theme dropdowns are never touched).

   A _numConverting guard flag prevents the observer from triggering
   itself recursively when it modifies a text node.
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

/* ââ Digit lookup tables âââââââââââââââââââââââââââââââââââââââââââ */
var OD_DIGIT = ['à­¦','à­§','à­¨','à­©','à­ª','à­«','à­¬','à­­','à­®','à­¯'];
var EN_DIGIT = {
    'à­¦':'0','à­§':'1','à­¨':'2','à­©':'3','à­ª':'4',
    'à­«':'5','à­¬':'6','à­­':'7','à­®':'8','à­¯':'9'
};

function toOdiaDigits(s) {
    return s.replace(/[0-9]/g, function (d) { return OD_DIGIT[+d]; });
}
function toEnglishDigits(s) {
    return s.replace(/[à­¦-à­¯]/g, function (d) { return EN_DIGIT[d] || d; });
}

/* ââ Tags whose text content must never be modified âââââââââââââââ */
var NUM_SKIP_TAGS = /^(SCRIPT|STYLE|NOSCRIPT|INPUT|TEXTAREA|CANVAS|OPTION)$/;

/* ââ Convert a single DOM text node in-place âââââââââââââââââââââââ */
function convertOneNode(node, lang) {
    if (!node || node.nodeType !== 3) return;          // must be a text node
    var p = node.parentElement;
    if (!p || NUM_SKIP_TAGS.test(p.tagName)) return;   // skip disallowed tags
    if (p.tagName === 'SELECT' || p.closest('select')) return; // skip dropdowns

    if (lang === 'od' && /[0-9]/.test(node.nodeValue)) {
        node.nodeValue = toOdiaDigits(node.nodeValue);
    } else if (lang === 'en' && /[à­¦-à­¯]/.test(node.nodeValue)) {
        node.nodeValue = toEnglishDigits(node.nodeValue);
    }
}

/* ââ Full-page sweep using TreeWalker ââââââââââââââââââââââââââââââ */
function convertPageNumbers(lang) {
    _numConvLang = lang;

    var walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT,
        null,
        false
    );
    var node;
    while ((node = walker.nextNode())) {
        convertOneNode(node, lang);
    }

    /* Start observer in Odia mode to catch dynamic updates;
       stop it in English mode (nothing to watch for).        */
    if (lang === 'od') {
        startNumberObserver();
    } else {
        stopNumberObserver();
    }
}

/* ââ MutationObserver â watches for JS-driven digit changes âââââââââ
   Handles: counter animations, AJAX-filled numbers, FY selector,
   dynamically rendered news cards, visitor count, etc.
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   _numConverting prevents the observer from firing on its own writes
   (modifying a text node emits a characterData mutation which would
   otherwise re-trigger the callback in an infinite loop).            */
var _numConvLang   = 'en';   // tracks the active language for the observer
var _numConverting = false;  // re-entrancy guard
var _numObserver   = null;

function handleMutations(mutations) {
    if (_numConverting) return;
    _numConverting = true;

    mutations.forEach(function (m) {

        /* Text content was changed directly (e.g. counter animation) */
        if (m.type === 'characterData') {
            convertOneNode(m.target, _numConvLang);
        }

        /* New nodes were inserted (e.g. AJAX-rendered news cards) */
        if (m.type === 'childList') {
            m.addedNodes.forEach(function (n) {
                if (n.nodeType === 3) {
                    /* Bare text node added */
                    convertOneNode(n, _numConvLang);
                } else if (n.nodeType === 1) {
                    /* Element added â walk all its text node descendants */
                    var w = document.createTreeWalker(
                        n, NodeFilter.SHOW_TEXT, null, false
                    );
                    var t;
                    while ((t = w.nextNode())) convertOneNode(t, _numConvLang);
                }
            });
        }
    });

    _numConverting = false;
}

function startNumberObserver() {
    if (!_numObserver) {
        _numObserver = new MutationObserver(handleMutations);
    }
    /* Re-observe (safe to call even if already observing) */
    _numObserver.observe(document.body, {
        childList    : true,   // catch newly inserted elements / text nodes
        characterData: true,   // catch in-place text changes (animation frames)
        subtree      : true    // watch the entire body subtree
    });
}

function stopNumberObserver() {
    if (_numObserver) {
        _numObserver.disconnect();
    }
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   CHART LOCALIZATION
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   Chart.js draws everything on <canvas>.  The DOM tree-walker and
   MutationObserver used for regular text CANNOT reach canvas pixels.
   Charts must be updated directly via Chart.getChart(canvasId).

   Label translation is driven by localization.json where keys exist:
     'Completed'   â cusl-sd-sch3  (already present)
     'In Progress' â cusl-sd-sch4  (already present)
     'Sanctioned'  â cusl-chart-sanctioned  (added)
     'Not Started' â cusl-chart-notstarted  (added)

   Axis digits are converted with the same toOdiaDigits() used for
   DOM text, applied through Chart.js tick callbacks.

   A dedicated IntersectionObserver on #stats handles the lazy-init
   case: if the user switches language before scrolling to the charts,
   the observer fires 300 ms after the section enters view
   (giving Index.cshtml's own initCharts() call time to complete).
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */

/* English chart-label  â  localization.json key
   "Completed" and "In Progress" reuse the existing cusl-sd-sch keys. */
var CHART_LABEL_KEYS = {
    'Sanctioned'  : 'cusl-chart-sanctioned',
    'Not Started' : 'cusl-chart-notstarted',
    'In Progress' : 'cusl-sd-sch4',
    'Completed'   : 'cusl-sd-sch3'
};

/* Translate one chart label in either direction using the JSON data */
function translateChartLabel(label, lang) {
    /* Reverse-lookup: convert an Odia label back to its English form */
    var enLabel = label;
    var found = Object.keys(CHART_LABEL_KEYS).find(function (k) {
        var entry = localizationData[CHART_LABEL_KEYS[k]];
        return entry && entry.od === label;
    });
    if (found) enLabel = found;

    if (lang === 'en') return enLabel;

    /* Forward: English â Odia via localizationData */
    var key   = CHART_LABEL_KEYS[enLabel];
    var entry = localizationData[key];
    return (entry && entry[lang]) || label;
}

/* Tick callbacks â closures capture lang so switching direction works */
function makeXTickCb(lang) {
    return function (val) {
        var label = (typeof this.getLabelForValue === 'function')
            ? this.getLabelForValue(val) : String(val);
        return lang === 'od' ? toOdiaDigits(label) : label;
    };
}
function makeYTickCb(lang) {
    return function (val) {
        var s = Number(val).toLocaleString('en-IN');
        return lang === 'od' ? toOdiaDigits(s) : s;
    };
}

/* ââ Update a doughnut / pie chart ââ */
function updatePieChart(chartId, lang) {
    if (typeof Chart === 'undefined' || typeof Chart.getChart !== 'function') return;
    var chart = Chart.getChart(chartId);
    if (!chart) return;

    /* Translate segment labels â these also drive the legend entries */
    chart.data.labels = (chart.data.labels || []).map(function (l) {
        return translateChartLabel(l, lang);
    });

    /* Tooltip label */
    chart.options.plugins = chart.options.plugins || {};
    chart.options.plugins.tooltip = chart.options.plugins.tooltip || {};
    chart.options.plugins.tooltip.callbacks = {
        label: function (ctx) {
            var lbl = translateChartLabel(ctx.label || '', lang);
            var val = (typeof ctx.parsed === 'number') ? ctx.parsed : (ctx.raw || 0);
            var valStr = lang === 'od'
                ? toOdiaDigits(val.toLocaleString('en-IN'))
                : val.toLocaleString('en-IN');
            return ' ' + lbl + ': ' + valStr;
        }
    };

    chart.update('none'); // skip re-animation for speed
}

/* ââ Update a bar chart ââ */
function updateBarChart(chartId, lang) {
    if (typeof Chart === 'undefined' || typeof Chart.getChart !== 'function') return;
    var chart = Chart.getChart(chartId);
    if (!chart) return;

    /* Dataset legend labels */
    (chart.data.datasets || []).forEach(function (ds) {
        ds.label = translateChartLabel(ds.label || '', lang);
    });

    /* X-axis â financial-year strings like "2024-25" â "à­¨à­¦à­¨à­ª-à­¨à­«" */
    if (chart.options.scales && chart.options.scales.x) {
        chart.options.scales.x.ticks = chart.options.scales.x.ticks || {};
        chart.options.scales.x.ticks.callback = makeXTickCb(lang);
    }

    /* Y-axis â numeric ticks */
    if (chart.options.scales && chart.options.scales.y) {
        chart.options.scales.y.ticks = chart.options.scales.y.ticks || {};
        chart.options.scales.y.ticks.callback = makeYTickCb(lang);
    }

    /* Tooltip */
    chart.options.plugins = chart.options.plugins || {};
    chart.options.plugins.tooltip = chart.options.plugins.tooltip || {};
    chart.options.plugins.tooltip.callbacks = {
        label: function (ctx) {
            var lbl = translateChartLabel(ctx.dataset.label || '', lang);
            var val = (ctx.parsed && typeof ctx.parsed.y === 'number') ? ctx.parsed.y : (ctx.raw || 0);
            var valStr = lang === 'od'
                ? toOdiaDigits(val.toLocaleString('en-IN'))
                : val.toLocaleString('en-IN');
            return ' ' + lbl + ': ' + valStr;
        }
    };

    chart.update('none');
}

/* ââ Update all four charts on the page ââ */
function updateChartLocalization(lang) {
    updatePieChart('legacyPieChart', lang);
    updateBarChart('legacyBarChart', lang);
    updatePieChart('newPieChart',    lang);
    updateBarChart('newBarChart',    lang);
}

/* ââ IntersectionObserver: translate charts after lazy init âââââââââ
   Index.cshtml inits charts only when #stats enters the viewport.
   If language is already Odia at that point, charts are born with
   English labels.  This observer fires 300 ms after #stats appears,
   giving initCharts() (synchronous) time to complete first.          */
$(document).ready(function () {
    var statsEl = document.getElementById('stats');
    if (!statsEl) return;

    var _chartLangObs = new IntersectionObserver(function (entries, obs) {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        setTimeout(function () {
            var lang = localStorage.getItem('slectedlang') || 'en';
            if (lang !== 'en') updateChartLocalization(lang);
        }, 300);
    }, { threshold: 0.05 });

    _chartLangObs.observe(statsEl);
});

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   CORE TRANSLATION ROUTINE
   isChange = true  â user actively picked a language (persist it)
   isChange = false â page-load restore of saved preference
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
function fixCopyrightLabels(lang) {
    var $bar = $('#footer .copyright-bar');
    if (!$bar.length) return;

    var luoEn = (localizationData['cusl-ft-luo'] && localizationData['cusl-ft-luo'].en) || 'Last Updated On';
    var luoOd = (localizationData['cusl-ft-luo'] && localizationData['cusl-ft-luo'].od) || 'à¬¶à­à¬· à¬à¬¦à­à­à¬¤à¬¨';
    var vhEn = (localizationData['cusl-ft-vh'] && localizationData['cusl-ft-vh'].en) || 'Visitors';
    var vhOd = (localizationData['cusl-ft-vh'] && localizationData['cusl-ft-vh'].od) || 'à¬ªà¬°à¬¿à¬¦à¬°à­à¬¶à¬';

    // "Last Updated On: dd/MM/yyyy" â second span; target by position so it
    // works whether cusl-ft-luo is on an inner label-only span or the outer
    // span that also contains the date. Only the text node is replaced.
    $bar.find('> span:nth-child(2)').contents().filter(function () {
        return this.nodeType === 3;
    }).each(function () {
        this.nodeValue = lang === 'od'
            ? this.nodeValue.replace(luoEn, luoOd)
            : this.nodeValue.replace(luoOd, luoEn);
    });

    // "Visitors: <span>99</span>" â third span; replace only the text node
    // before the visitor-badge span, leaving the count untouched.
    $bar.find('> span:nth-child(3)').contents().filter(function () {
        return this.nodeType === 3 && this.nodeValue.trim() !== '';
    }).each(function () {
        this.nodeValue = lang === 'od'
            ? this.nodeValue.replace(new RegExp(vhEn + '\\s*:?', 'g'), vhOd + ':')
            : this.nodeValue.replace(new RegExp(vhOd + '\\s*:?', 'g'), vhEn + ':');
    });
}
var NEWS_CAT_KEYS = {
    'Press Release': 'cusl-ne-cat-pr',
    'Announcement': 'cusl-ne-cat-an',
    'Event': 'cusl-ne-cat-ev',
    'Training': 'cusl-ne-cat-tr',
    'Government': 'cusl-ne-cat-gv',
    'Field Visit': 'cusl-ne-cat-fv'
};

function translateNewsCards(lang) {
    if (!Object.keys(localizationData).length) return;

    // Category tags â each card has a different label, translate per-element
    $('#newsGrid .news-cat').each(function () {
        $(this).contents().filter(function () {
            return this.nodeType === 3 && this.nodeValue.trim() !== '';
        }).each(function () {
            var text = this.nodeValue.trim();
            var key = NEWS_CAT_KEYS[text]; // forward: English â key
            if (!key) {                     // reverse:  Odia   â English â key
                var en = Object.keys(NEWS_CAT_KEYS).find(function (k) {
                    var e = localizationData[NEWS_CAT_KEYS[k]];
                    return e && e.od === text;
                });
                if (en) key = NEWS_CAT_KEYS[en];
            }
            if (key && localizationData[key] && localizationData[key][lang]) {
                var ws = this.nodeValue.match(/^\s*/)[0];
                this.nodeValue = ws + localizationData[key][lang];
            }
        });
    });

    // "Read More" â same text on every card
    var rmEntry = localizationData['cusl-ne-rm'];
    if (rmEntry && rmEntry[lang]) {
        applyTextNodes($('#newsGrid .btn-readmore'), rmEntry[lang]);
    }
}

// Re-translate whenever newsPage() replaces the grid HTML
$(document).ready(function () {
    var grid = document.getElementById('newsGrid');
    if (!grid) return;
    new MutationObserver(function (mutations) {
        var hasCards = mutations.some(function (m) {
            return m.type === 'childList' && m.addedNodes.length > 0;
        });
        if (!hasCards) return;
        var lang = localStorage.getItem('slectedlang') || 'en';
        if (lang !== 'en') setTimeout(function () { translateNewsCards(lang); }, 0);
    }).observe(grid, { childList: true });
});
function updateLocalization(lang, isChange) {
    if (isCgfPage()) return;

    if (isChange) {
        localStorage.setItem('slectedlang', lang);
    } else {
        var saved = localStorage.getItem('slectedlang');
        if (saved === 'en' || saved === 'od') {
            lang = saved;
            syncLangSelects(lang);
        } else {
            localStorage.setItem('slectedlang', lang);
        }
    }

    /* 1. Selector-map: handles new _NewLayout markup without class changes */
    applySelectors(lang);

    applyCmsText(lang);

    /* 1a. Element-specific fixes not covered by the selector map           */
    fixAboutHeading(lang);     // clears "Members of Legislative Assembly" textnode in Odia
    fixCopyrightLabels(lang);
    /* News & Events cards are CMS-driven now (CMS > News And Events), so re-render them for
       the selected language instead of translating the old hardcoded demo text. */
    if (typeof renderNews === 'function') { renderNews(); } else { translateNewsCards(lang); }
    /* 2. JSON class scan: handles inner pages / cusl-* marker classes      */
    applyJsonClasses(lang);

    /* 3. Auxiliary: news filtering, chart image swap                        */
    showLatestNews(lang);
    try { UpdateIndexChartNoDataImage(); } catch (e) { /* not on this page */ }

    /* 4. Number conversion â runs last so it catches everything already
          written by steps 1-3.  The MutationObserver then handles any
          digits written later by AJAX callbacks or counter animations. */
    convertPageNumbers(lang);

    /* 5. Chart localization â canvas is unreachable by the DOM walker;
          charts are updated directly via Chart.getChart().  A no-op if
          the charts have not yet been initialised (the IntersectionObserver
          added below handles that lazy-init case automatically).          */
    updateChartLocalization(lang);
}

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   PUBLIC ENTRY POINT
   Called from <select class="lang-select" onchange="changeLang(this.value)">
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
function changeLang(lang) {
    if (isCgfPage()) return;
    syncLangSelects(lang);
    updateLocalization(lang, true);

    // Slick-slider news filter (silently no-ops if no slider on this page)
    var $slider = $('.slider');
    if ($slider.length && typeof $slider.slick === 'function') {
        try {
            $slider.slick('slickUnfilter');
            $slider.slick('slickFilter', '.lang-' + lang);
        } catch (e) { /* not initialised */ }
    }
}
window.changeLang = changeLang; // reachable from inline onchange=""

/* ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ
   INIT â fetch JSON once, then apply saved / default language
   ââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââââ */
$(document).ready(function () {
    if (isCgfPage()) return;

    $.getJSON('/js/tooltip/localization.json', function (data) {
        localizationData = data;

        var saved   = localStorage.getItem('slectedlang');
        var initial = (saved === 'en' || saved === 'od')
            ? saved
            : ($('.lang-select').val() || 'en');

        syncLangSelects(initial);
        updateLocalization(initial, false);
    });
});
