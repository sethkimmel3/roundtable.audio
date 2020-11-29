$.fn.isIOSChrome = function(){
    if(navigator.userAgent.match('CriOS')){
        return true;
    }
    return false;
}

$.fn.isIOSFirefox = function(){
    if(navigator.userAgent.match("FxiOS")){
        return true;
    }
    return false;
}

$.fn.isIncompatibleBrowser = function(){
    if($.fn.isIOSChrome() || $.fn.isIOSFirefox()){
        return true;
    }
    return false;
}
