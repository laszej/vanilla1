function AttachMouseBoundingAnimation(cfg, svgSymbol = undefined) {
    if(svgSymbol === undefined && cfg.svgSymbol != undefined)
        svgSymbol = cfg.svgSymbol;            
    //else
        //return;
    svgSymbol.mouseover( function(evt) {          
        if(!drawingObject.updated)
            return;
        var drawAnim = false;                    
        if(cfg.bounding === undefined) {
            var bbx = svgSymbol.bbox();
            invalidateAllBounding();
            var margin = 4;                        
            cfg.bounding = svgScheme.rect(svgSymbol.bbox().width+margin, svgSymbol.bbox().height+margin).move(
                svgSymbol.bbox().x-margin/2, svgSymbol.bbox().y-margin/2).stroke({color: '#333', width: 2}).fill("none");
            drawAnim = true;
        }
        else if(!cfg.bounding.visible()) {
            cfg.bounding.show();                        
            drawAnim = true;                        
        }   
        if(drawAnim) {                        
            if(cfg.boundingAnimation === undefined)
                cfg.boundingAnimation = svgScheme.rect(svgSymbol.bbox().width+10, svgSymbol.bbox().height+10).move(
                    svgSymbol.bbox().x-5, svgSymbol.bbox().y-5).stroke({color: '#F20', width: 5}).fill("none").animate(500).opacity(0);
            else
                cfg.boundingAnimation.animate(1).opacity(1).animate(500).opacity(0);
        }
        if(!mouseOverCtrl.locked)
            mouseOverCtrl.reference = cfg;
    });
    svgSymbol.mouseout( function(evt) {                    
        if(!mouseOverCtrl.locked && drawingObject.updated) {
            invalidateBounding(cfg);
            mouseOverCtrl.reference = undefined;
        }
    });
    cfg.mouseBoundingAnimationAttached = true;
}

 function addButtonToScheme(button, replace = undefined) {
    if(button != undefined) {
        if(button.svgSymbol != undefined)
            replace.svgSymbol.remove();
        if(button.svgSymbolToBeUsed != undefined)
            button.svgSymbolToBeUsed.remove();
    } 
    button.svgSymbolToBeUsed = svgScheme.symbol();
    button.svgSymbolToBeUsed.rect(button.width, button.height).stroke({color: "#666", width: 2}).fill(parseColor(button.color));
    button.svgSymbolToBeUsed.text( function(add) {
        //var defText = drawingObject.defaults.tekst;
        var tSpan = add.tspan(button.nazwa).font({ font: "Verdana", size: button.fontsize + "pt"}).attr('letter-spacing', '1px');
        tSpan.font.anchor = "middle";                                        
        tSpan.dx((button.width - tSpan.bbox().width)/2);
        fillColor(tSpan, button.txtColor);
        tSpan.dy(button.height/2 + 4);
    });
    button.svgSymbol = svgScheme.use(button.svgSymbolToBeUsed).move(button.x, button.y);

    if(button.mouseBoundingAnimationAttached != true && (!Array.isArray(button.users) || button.users.find(usr => {return (usr === '@all' || usr === viewModel.username)}))) 
    {
        AttachMouseBoundingAnimation(button);                
    }
}



function drawText(cfg) {
    if(cfg.svgSymbol != undefined) 
        cfg.svgSymbol.remove();

    cfg.svgSymbol = svgScheme.text( function(add) {
        var text = cfg.text;
        if(cfg.stateL != undefined) {
            if(cfg.stateH === undefined) {
                if(cfg.stateL & 0x80 && cfg.textOn != undefined)
                    text = cfg.textOn;
                else if(!(cfg.stateL & 0x80) && cfg.textOff != undefined)
                    text = cfg.textOff;
            }
            else {
                if(cfg.stateL & 0x80 && !(cfg.stateH & 0x80) && cfg.textOff != undefined) {                      
                    text = cfg.textOff;
                }
                if(!(cfg.stateL & 0x80) && cfg.stateH & 0x80 && cfg.textOn != undefined) {                      
                    text = cfg.textOn;
                }
            }
        }
        var tSpan = add.tspan(text).font({ font: "Verdana", size: cfg.fontsize + "pt", weight: (cfg.bold?"bold":"normal") }).attr('letter-spacing', '1px');                    
        if(cfg.align === "right") {
            tSpan.font.anchor = "end";
            var bibox = tSpan.bbox();
            var w = tSpan.bbox().width;
            tSpan.dx(cfg.x + cfg.width - tSpan.bbox().width);
            var w1 = tSpan.dx();
        }
        else if(cfg.align === "center") {
            tSpan.font.anchor = "middle";                                        
            tSpan.dx(cfg.x + (cfg.width - tSpan.bbox().width)/2);
        }  
        else {
            tSpan.font.anchor = "start";
            tSpan.dx(cfg.x);
        }
        if(cfg.stateL != undefined) {
            if(cfg.stateH != undefined) {
                cfg.stateL |= cfg.stateH & 0x7F;                
                cfg.stateH |= cfg.stateL & 0x7F;
            }                                
            if(!(cfg.stateL & 0x01) )
                fillColor(tSpan, cfg.colorNdef);
            else if(cfg.stateL & 0x04)
                fillColor(tSpan, cfg.colorNw);
            else if(cfg.stateH === undefined)
                fillColor(tSpan, (cfg.stateL & 0x80) ? cfg.colorOn : cfg.colorOff);
            else if(cfg.stateL & 0x80)
                fillColor(tSpan, (cfg.stateH & 0x80) ? cfg.color11 : cfg.colorOff);
            else
                fillColor(tSpan, (cfg.stateH & 0x80) ? cfg.colorOn : cfg.color00);
        }
        else 
            fillColor(tSpan, cfg.color);
        tSpan.dy(cfg.y + cfg.height/2 + 4);
    });
}
//------------------------------------------------------------  
function fillColor(object, colorStr) {
    object.fill(parseColor(colorStr));
}

function parseColor(colorStr) {
    if(colorStr.length < 7)
        return ("#" + colorStr.slice(1).padStart(6, '0'));
    else
        return colorStr;
}

function onElementFocused(e) {
    if (e && e.target)
        document.activeElement = (e.target === document ? null : e.target);
}

document.addEventListener("focus", onElementFocused, true);
CtrlOnText = "";
var svgScheme, mainSvg;
var viewBoxSize = {
    width: 400,
    height: 450
};


var drawingObject = {
    defaults: {
        tekst: {
            fontsize: 0,
            bold: false,
            align: "left",
            color: undefined,
            colorOn: undefined,
            colorOff: undefined,
            color00: undefined,
            color11: undefined,
            colorNw: undefined,
            colorNdef: undefined,
            textOn: undefined,
            textOff: undefined,
            //colorAlarmH: undefined,
            //colorAlarmL: undefined,
        },
        pomiar: {
            fontsize: 0,
            bold: false,
            align: "left",
            colorOk: undefined,
            colorAlarmH: undefined,
            colorAlarmL: undefined,
            colorNw: undefined,
            colorNdef: undefined,
            mul: 1,
            div: 1, 
            przecinek: 0,
            unit: ""
        }
    },
    linie: [],
    teksty: [],
    tele: [],
    symbol: [],
    pomiary: [],
    buttons: [],
    lists: [],
    //comboBox: [],
    checkBox: [],
    updated: false,   
    testowyLicznikNaIndeksie: {index: undefined, value: undefined},            
    GetDbRanges:  function() {
        var ranges = {
            binary: {
                start : undefined,
                count : undefined
            },
            analog: {
                start : undefined,
                count : undefined
            }
        };
        var minBin = undefined, maxBin = undefined;
        drawingObject.tele.forEach( function(telem) {
            if(minBin === undefined || telem.weL < minBin)
                minBin = telem.weL;
            if(minBin === undefined || telem.weH < minBin)
                minBin = telem.weH;
            if(maxBin === undefined || telem.weL > maxBin)
                maxBin = telem.weL;
            if(maxBin === undefined || telem.weH > maxBin)
                maxBin = telem.weH;
        });                
        drawingObject.teksty.forEach( function(tekst) {
            if(minBin === undefined || tekst.weL < minBin)
                minBin = tekst.weL;
            if(minBin === undefined || tekst.weH < minBin)
                minBin = tekst.weH;
            if(maxBin === undefined || tekst.weL > maxBin)
                maxBin = tekst.weL;
            if(maxBin === undefined || tekst.weH > maxBin)
                maxBin = tekst.weH;
        });
        drawingObject.checkBox.forEach( function(chbox) {
            if(minBin === undefined || chbox.weL < minBin)
                minBin = chbox.weL;
            if(maxBin === undefined || chbox.weL > maxBin)
                maxBin = chbox.weL;
        });

        var minAnl = undefined, maxAnl = undefined;
        drawingObject.pomiary.forEach( function(pomiar) {
            if(minAnl === undefined || pomiar.we < minAnl)
                minAnl = pomiar.we;
            if(maxAnl === undefined || pomiar.we > maxAnl)
                maxAnl = pomiar.we;
            if(pomiar.list != undefined) {
                pomiar.list.elements.forEach( function(element) {
                    if(minAnl === undefined || element.value < minAnl)
                        minAnl = element.value;
                    if(maxAnl === undefined || element.value > maxAnl)
                        maxAnl = element.value;
                    element.formatIndexList.forEach(fil => {
                        if(minAnl === undefined || fil.index < minAnl)
                            minAnl = fil.index;
                        if(maxAnl === undefined || fil.index > maxAnl)
                            maxAnl = fil.index;
                    });
                });
            }
        });
        if(drawingObject.testowyLicznikNaIndeksie.index != undefined) {
            if(minAnl === undefined || drawingObject.testowyLicznikNaIndeksie.index < minAnl)
                minAnl = drawingObject.testowyLicznikNaIndeksie.index;
            if(maxAnl === undefined || drawingObject.testowyLicznikNaIndeksie.index > maxAnl)
                maxAnl = drawingObject.testowyLicznikNaIndeksie.index;
        }
        /*drawingObject.comboBox.forEach(function(combo) {
            if(minAnl === undefined || combo.indeksPomiaru < minAnl)
                minAnl = combo.indeksPomiaru;
            if(maxAnl === undefined || combo.indeksPomiaru > maxAnl)
                maxAnl = combo.indeksPomiaru;
        });*/
        ranges.binary.start = minBin;
        if(minBin != undefined)
            ranges.binary.count = maxBin - minBin + 1;
        ranges.analog.start = minAnl;
        if(minAnl != undefined)
            ranges.analog.count = maxAnl - minAnl + 1;
        return ranges;
    },


    clear:  function() {
        this.defaults.tekst.fontsize = 0;
        this.defaults.tekst.bold = false;
        this.defaults.tekst.align = "left";
        this.defaults.tekst.color = undefined;
        this.defaults.tekst.colorOn = undefined;
        this.defaults.tekst.colorOff = undefined;
        this.defaults.tekst.textOn = undefined;
        this.defaults.tekst.textOff = undefined;
        this.defaults.tekst.color00 = undefined;
        this.defaults.tekst.color11 = undefined;
        this.defaults.tekst.colorNw = undefined;
        this.defaults.tekst.colorNdef = undefined;
        this.defaults.pomiar.fontsize =  0;
        this.defaults.pomiar.bold = false;
        this.defaults.pomiar.align = "left";
        this.defaults.pomiar.colorOk = undefined;
        this.defaults.pomiar.colorAlarmH = undefined;
        this.defaults.pomiar.colorAlarmL = undefined;
        this.defaults.pomiar.colorNw = undefined;
        this.defaults.pomiar.colorNdef = undefined;
        this.defaults.pomiar.mul = 1;
        this.defaults.pomiar.div = 1; 
        this.defaults.pomiar.przecinek = 0;
        this.defaults.pomiar.unit = "";
        //this.defaults.checkBox = this.defaults.tekst;
        this.linie = [];
        this.teksty = [];
        this.tele = [];
        this.lists = [];
        //this.comboBox = [];
        this.checkBox = [];
        this.symbol = [];
        this.pomiary = [];
        this.buttons = [];
        this.updated = false;
    }
};  









function xmlToSvg(xmlInput) {
    drawingObject.clear();
    var svgDiv = document.getElementById("svgDiv");
    if(svgDiv === undefined)
        return;
    else
        document.getElementById("svgDiv").innerHTML = "";            

    svgMouseDown = undefined;
    svgTranslated = {x: 0, y: 0};
    mouseOverCtrl = {locked: false, reference: undefined};



    if(mainSvg === undefined)
        mainSvg = SVG('svgDiv')
    else {
        mainSvg.clear();
        mainSvg = SVG('svgDiv')
    }
    svgScheme = mainSvg.viewbox(0, 0, viewBoxSize.width, viewBoxSize.height);            
    if(true) {
        var domyslne, obiekty, schemat, i, j, xmlDoc, linieBloki = [];

        xmlDoc = xmlInput                             
        domyslne = xmlDoc.getElementsByTagName("domyslne");
        obiekty = xmlDoc.getElementsByTagName("obiekt");
        schemat = xmlDoc.getElementsByTagName("schemat");

        if(schemat.length) {
            if(schemat[0].attributes.nazwa != undefined) {
                drawingObject.nazwa = schemat[0].attributes.nazwa.nodeValue;
                drawingObject.nazwaSS = (schemat[0].attributes.ss_bay === undefined ? drawingObject.nazwa : schemat[0].attributes.ss_bay.nodeValue);
                currentScheme = drawingObject.nazwa;                      
            }
            else 
                currentScheme = xmlInput.responseURL;
            if(schemat[0].attributes.bckg_color != undefined)
                drawingObject.backgroundColor = schemat[0].attributes.bckg_color.nodeValue;
            if(schemat[0].attributes.ack_index != undefined)
                drawingObject.testowyLicznikNaIndeksie.index = parseInt(schemat[0].attributes.ack_index.nodeValue);
        }

        if(domyslne.length) {
            for(i = 0; i < domyslne[0].children.length; i++) {
                if(domyslne[0].children[i].tagName == "tekst") {
                    drawingObject.defaults.tekst = {
                        fontsize: parseInt(domyslne[0].children[i].attributes.fontsize.nodeValue),
                        width: parseInt(domyslne[0].children[i].attributes.width.nodeValue),
                        height: parseInt(domyslne[0].children[i].attributes.height.nodeValue),
                        bold: (domyslne[0].children[i].attributes.bold.nodeValue == "0" ? false : true),
                        align: domyslne[0].children[i].attributes.align.nodeValue,
                        color: domyslne[0].children[i].attributes.kolor.nodeValue,
                        colorOn: domyslne[0].children[i].attributes.kolorON.nodeValue,
                        colorOff: domyslne[0].children[i].attributes.kolorOFF.nodeValue,
                        color00: domyslne[0].children[i].attributes.kolor00.nodeValue,
                        color11: domyslne[0].children[i].attributes.kolor11.nodeValue,
                        colorNw: domyslne[0].children[i].attributes.kolorNW.nodeValue,
                        colorNdef: domyslne[0].children[i].attributes.kolorNDEF.nodeValue
                    }
                }
                if(domyslne[0].children[i].tagName == "checkbox") {
                    drawingObject.defaults.checkBox = {
                        fontsize: parseInt(domyslne[0].children[i].attributes.fontsize.nodeValue),
                        width: parseInt(domyslne[0].children[i].attributes.width.nodeValue),
                        height: parseInt(domyslne[0].children[i].attributes.height.nodeValue),
                        bold: (domyslne[0].children[i].attributes.bold.nodeValue == "0" ? false : true),
                        color: domyslne[0].children[i].attributes.kolor.nodeValue,
                    }
                }
                if(domyslne[0].children[i].tagName == "pomiar") {
                    drawingObject.defaults.pomiar = {
                        fontsize: parseInt(domyslne[0].children[i].attributes.fontsize.nodeValue),
                        width: parseInt(domyslne[0].children[i].attributes.width.nodeValue),
                        height: parseInt(domyslne[0].children[i].attributes.height.nodeValue),
                        mul: parseFloat(domyslne[0].children[i].attributes.mul.nodeValue.replace(",",".")),
                        div: parseFloat(domyslne[0].children[i].attributes.div.nodeValue.replace(",",".")),
                        przecinek: parseInt(domyslne[0].children[i].attributes.przecinek.nodeValue),
                        unit: (domyslne[0].children[i].attributes.unit ? domyslne[0].children[i].attributes.unit.nodeValue : ""),
                        bold: (domyslne[0].children[i].attributes.bold.nodeValue == "0" ? false : true),
                        align: domyslne[0].children[i].attributes.align.nodeValue,                                
                        colorOk: domyslne[0].children[i].attributes.kolorOK.nodeValue,
                        colorAlarmH: domyslne[0].children[i].attributes.koloralarmH.nodeValue,
                        colorAlarmL: domyslne[0].children[i].attributes.koloralarmL.nodeValue,
                        colorNw: domyslne[0].children[i].attributes.kolorNW.nodeValue,
                        colorNdef: domyslne[0].children[i].attributes.kolorNDEF.nodeValue
                    }
                }
                if(domyslne[0].children[i].tagName == "button") {
                    drawingObject.defaults.button = {
                        width: parseInt(domyslne[0].children[i].attributes.width.nodeValue),
                        height: parseInt(domyslne[0].children[i].attributes.height.nodeValue),
                        nazwa: domyslne[0].children[i].attributes.nazwa.nodeValue,
                        path: domyslne[0].children[i].attributes.plik.nodeValue,    
                        color: domyslne[0].children[i].attributes.kolorBtn.nodeValue,    
                        txtColor: domyslne[0].children[i].attributes.kolorFont.nodeValue,    
                        fontsize: parseInt(domyslne[0].children[i].attributes.sizeFont.nodeValue),
                        users: ['@all']                  
                    }
                }
            }
        }

        for(i = 0; i < obiekty.length; i++) {
            //węzły zrobić osobno!!!
            if(obiekty[i].attributes.typ.nodeValue == "linia") {
                for(j = 0; j < obiekty[i].children.length; j++) {
                    var type = parseInt(obiekty[i].children[j].attributes.bmp.nodeValue);
                    switch(type) {
                        case 1:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 2:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 3:
                        case 12:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 4:
                        case 13:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 5:
                        case 14:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 6:
                        case 15:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 7:
                        case 16:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 8:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 9:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 10:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 11:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                        case 12:
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue),
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 8,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 16,                                
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        linieBloki.push({
                            x1: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                            y1: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            x2: parseInt(obiekty[i].children[j].attributes.x.nodeValue) + 16,
                            y2: parseInt(obiekty[i].children[j].attributes.y.nodeValue) + 8,
                            colorStr: obiekty[i].children[j].attributes.kolor.nodeValue
                        });
                        break;
                    }
                }
            }
            else if(obiekty[i].attributes.typ.nodeValue == "tele") {
                for(j = 0; j < obiekty[i].children.length; j++) {
                    drawingObject.tele.push({
                        x: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                        y: parseInt(obiekty[i].children[j].attributes.y.nodeValue),                                
                        weL: (obiekty[i].children[j].attributes.weL == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.weL.nodeValue)),
                        weH: (obiekty[i].children[j].attributes.weH == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.weH.nodeValue)),
                        neg: (obiekty[i].children[j].attributes.neg == undefined ? false : (parseInt(obiekty[i].children[j].attributes.neg.nodeValue) ? true : false)),
                        sterL: (obiekty[i].children[j].attributes.sterL == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.sterL.nodeValue)),
                        sterH: (obiekty[i].children[j].attributes.sterH == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.sterH.nodeValue)),
                        sterA: (obiekty[i].children[j].attributes.sterA == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.sterA.nodeValue)),
                        sterR: (obiekty[i].children[j].attributes.sterM == undefined ? undefined : parseInt(obiekty[i].children[j].attributes.sterM.nodeValue)),
                        sterLname: (obiekty[i].children[j].attributes.name_ctrl_on == undefined ? 
                            (obiekty[i].children[j].attributes.sterL == undefined ? undefined : obiekty[i].children[j].attributes.sterL.nodeValue) 
                            : obiekty[i].children[j].attributes.name_ctrl_on.nodeValue),
                        sterHname: (obiekty[i].children[j].attributes.name_ctrl_off == undefined ? 
                            (obiekty[i].children[j].attributes.sterH == undefined ? undefined : obiekty[i].children[j].attributes.sterH.nodeValue) 
                            : obiekty[i].children[j].attributes.name_ctrl_off.nodeValue),
                        sterAname: (obiekty[i].children[j].attributes.name_ctrl_auto == undefined ? 
                            (obiekty[i].children[j].attributes.sterA == undefined ? undefined : obiekty[i].children[j].attributes.sterA.nodeValue) 
                            : obiekty[i].children[j].attributes.name_ctrl_auto.nodeValue),
                        sterRname: (obiekty[i].children[j].attributes.name_ctrl_man == undefined ? 
                            (obiekty[i].children[j].attributes.sterR == undefined ? undefined : obiekty[i].children[j].attributes.sterR.nodeValue) 
                            : obiekty[i].children[j].attributes.name_ctrl_man.nodeValue),
                        enableSetL: (obiekty[i].children[j].attributes.enableSetL == undefined ? undefined : obiekty[i].children[j].attributes.enableSetL.nodeValue),
                        enableSetH: (obiekty[i].children[j].attributes.enableSetH == undefined ? undefined : obiekty[i].children[j].attributes.enableSetH.nodeValue),

                        type: obiekty[i].children[j].attributes.bmp.nodeValue,
                        svgSymbol: {
                            state11: undefined,
                            state00: undefined,
                            state01: undefined,
                            state10: undefined,
                            state01unav: undefined,
                            state10unav: undefined,
                        }
                    });
                }
            }
            else if(obiekty[i].attributes.typ.nodeValue == "symbol") {
                for(j = 0; j < obiekty[i].children.length; j++) {
                    drawingObject.symbol.push({
                        x: parseInt(obiekty[i].children[j].attributes.x.nodeValue),
                        y: parseInt(obiekty[i].children[j].attributes.y.nodeValue),                                
                        type: obiekty[i].children[j].attributes.bmp.nodeValue
                    });
                }
            }
            else if(obiekty[i].attributes.typ.nodeValue == "tekst") {
                for(j = 0; j < obiekty[i].children.length; j++) {
                    var newItem = {
                        fontsize: parseInt(drawingObject.defaults.tekst.fontsize),
                        width: parseInt(drawingObject.defaults.tekst.width),
                        height: parseInt(drawingObject.defaults.tekst.height),
                        bold: drawingObject.defaults.tekst.bold == "0" ? false : true,
                        align: drawingObject.defaults.tekst.align,
                        color: drawingObject.defaults.tekst.color,
                        colorOn: drawingObject.defaults.tekst.colorOn,
                        colorOff: drawingObject.defaults.tekst.colorOff,
                        color00: drawingObject.defaults.tekst.color00,
                        color11: drawingObject.defaults.tekst.color11,
                        colorNw: drawingObject.defaults.tekst.colorNw,
                        colorNdef: drawingObject.defaults.tekst.colorNdef,                     
                    };
                    newItem.x = parseInt(obiekty[i].children[j].attributes.x.nodeValue);
                    newItem.y = parseInt(obiekty[i].children[j].attributes.y.nodeValue);
                    newItem.text = obiekty[i].children[j].attributes.nazwa.nodeValue;

                    if(obiekty[i].children[j].attributes.weL != undefined)
                        newItem.weL = parseInt(obiekty[i].children[j].attributes.weL.nodeValue);
                    if(obiekty[i].children[j].attributes.weH != undefined)
                        newItem.weH = parseInt(obiekty[i].children[j].attributes.weH.nodeValue);

                    if(obiekty[i].children[j].attributes.width != undefined)
                        newItem.width = parseInt(obiekty[i].children[j].attributes.width.nodeValue);
                    if(obiekty[i].children[j].attributes.height != undefined)
                        newItem.height = parseInt(obiekty[i].children[j].attributes.height.nodeValue);
                    if(obiekty[i].children[j].attributes.fontsize != undefined)
                        newItem.fontsize = parseInt(obiekty[i].children[j].attributes.fontsize.nodeValue);
                    if(obiekty[i].children[j].attributes.bold != undefined)
                        newItem.bold = (obiekty[i].children[j].attributes.bold.nodeValue == "0" ? false : true);
                    if(obiekty[i].children[j].attributes.align != undefined) 
                        newItem.align = obiekty[i].children[j].attributes.align.nodeValue;
                    if(obiekty[i].children[j].attributes.kolor != undefined)
                        newItem.color = obiekty[i].children[j].attributes.kolor.nodeValue;
                    if(obiekty[i].children[j].attributes.kolorON != undefined)
                        newItem.colorOn = obiekty[i].children[j].attributes.kolorON.nodeValue;
                    if(obiekty[i].children[j].attributes.kolorOFF != undefined)
                        newItem.colorOff = obiekty[i].children[j].attributes.kolorOFF.nodeValue;
                    if(obiekty[i].children[j].attributes.kolor00 != undefined)
                        newItem.color00 = obiekty[i].children[j].attributes.kolor00.nodeValue;
                    if(obiekty[i].children[j].attributes.kolor11 != undefined)
                        newItem.color11 = obiekty[i].children[j].attributes.kolor11.nodeValue;
                    if(obiekty[i].children[j].attributes.kolorNW != undefined)
                        newItem.colorNw = obiekty[i].children[j].attributes.kolorNW.nodeValue;
                    if(obiekty[i].children[j].attributes.kolorNDEF != undefined)
                        newItem.colorNdef = obiekty[i].children[j].attributes.kolorNDEF.nodeValue;
                    if(obiekty[i].children[j].attributes.txtON != undefined) {
                        newItem.textOn = obiekty[i].children[j].attributes.txtON.nodeValue;
                        if(newItem.textOn == "")
                            newItem.textOn = undefined;
                    }
                    if(obiekty[i].children[j].attributes.txtOFF != undefined) {
                        newItem.textOff = obiekty[i].children[j].attributes.txtOFF.nodeValue;                                
                        if(newItem.textOff == "")
                            newItem.textOff = undefined;
                    }
                    drawingObject.teksty.push(newItem);
                }
            }
            else if(obiekty[i].attributes.typ.nodeValue == "pomiar") {
                for(j = 0; j < obiekty[i].children.length; j++) {
                    var newItem = {
                        fontsize: drawingObject.defaults.pomiar.fontsize,                            
                        width: drawingObject.defaults.pomiar.width,
                        height: drawingObject.defaults.pomiar.height,      
                        mul: drawingObject.defaults.pomiar.mul,
                        div: drawingObject.defaults.pomiar.div,     
                        przecinek: drawingObject.defaults.pomiar.przecinek,
                        unit: drawingObject.defaults.pomiar.unit,
                        bold: drawingObject.defaults.pomiar.bold,
                        align: drawingObject.defaults.pomiar.align,                                                        
                        colorOk: drawingObject.defaults.pomiar.colorOk,
                        colorAlarmH: drawingObject.defaults.pomiar.colorAlarmH,
                        colorAlarmL: drawingObject.defaults.pomiar.colorAlarmL,                            
                        colorNw: drawingObject.defaults.tekst.colorNw,
                        colorNdef: drawingObject.defaults.tekst.colorNdef,    
                        allowChange: false                 
                    };
                    newItem.x = parseInt(obiekty[i].children[j].attributes.x.nodeValue);
                    newItem.y = parseInt(obiekty[i].children[j].attributes.y.nodeValue);
                    newItem.we = parseInt(obiekty[i].children[j].attributes.we.nodeValue);
                    if(obiekty[i].children[j].attributes.fontsize != undefined)
                        newItem.fontsize = parseInt(obiekty[i].children[j].attributes.fontsize.nodeValue);
                    if(obiekty[i].children[j].attributes.przecinek != undefined)
                        newItem.przecinek = parseInt(obiekty[i].children[j].attributes.przecinek.nodeValue);
                    if(obiekty[i].children[j].attributes.unit != undefined)
                        newItem.unit = obiekty[i].children[j].attributes.unit.nodeValue;
                    if(obiekty[i].children[j].attributes.width != undefined)
                        newItem.width = parseInt(obiekty[i].children[j].attributes.width.nodeValue);
                    if(obiekty[i].children[j].attributes.height != undefined)
                        newItem.height = parseInt(obiekty[i].children[j].attributes.height.nodeValue);                            
                    if(obiekty[i].children[j].attributes.bold != undefined)
                        newItem.bold = (obiekty[i].children[j].attributes.fontsize.nodeValue == "0" ? false : true);
                    if(obiekty[i].children[j].attributes.align != undefined)
                        newItem.align = obiekty[i].children[j].attributes.align.nodeValue;
                    if(obiekty[i].children[j].attributes.kolorOK != undefined)
                        newItem.colorOk = obiekty[i].children[j].attributes.kolorOK.nodeValue;
                    if(obiekty[i].children[j].attributes.kolorNW != undefined)
                        newItem.colorNw = obiekty[i].children[j].attributes.kolorNW.nodeValue;
                    if(obiekty[i].children[j].attributes.kolorNDEF != undefined)
                        newItem.colorNdef = obiekty[i].children[j].attributes.kolorNDEF.nodeValue;
                    if(obiekty[i].children[j].attributes.koloralarmH != undefined)
                        newItem.colorAlarmH = obiekty[i].children[j].attributes.koloralarmH.nodeValue;
                    if(obiekty[i].children[j].attributes.koloralarmL != undefined)
                        newItem.colorAlarmL = obiekty[i].children[j].attributes.koloralarmL.nodeValue;
                    if(obiekty[i].children[j].attributes.alarmH != undefined)
                        newItem.alarmH = parseFloat(obiekty[i].children[j].attributes.alarmH.nodeValue.replace(",","."));
                    if(obiekty[i].children[j].attributes.alarmL != undefined)
                        newItem.alarmL = parseFloat(obiekty[i].children[j].attributes.alarmL.nodeValue.replace(",","."));
                    if(obiekty[i].children[j].attributes.minVal != undefined)
                        newItem.minVal = parseFloat(obiekty[i].children[j].attributes.minVal.nodeValue.replace(",","."));
                    if(obiekty[i].children[j].attributes.maxVal != undefined)
                        newItem.maxVal = parseFloat(obiekty[i].children[j].attributes.maxVal.nodeValue.replace(",","."));
                    if(obiekty[i].children[j].attributes.ster != undefined)
                        newItem.ster = parseInt(obiekty[i].children[j].attributes.ster.nodeValue);    
                    if(obiekty[i].children[j].attributes.list != undefined && Array.isArray(drawingObject.lists))
                        newItem.list = drawingObject.lists.find(list => list.name == obiekty[i].children[j].attributes.list.nodeValue);
                    if(obiekty[i].children[j].attributes.change != undefined)
                        newItem.allowChange = obiekty[i].children[j].attributes.change.nodeValue == "yes";   
                    if(obiekty[i].children[j].attributes.mul != undefined)
                        newItem.mul =  parseFloat(obiekty[i].children[j].attributes.mul.nodeValue.replace(",","."));
                    if(obiekty[i].children[j].attributes.div != undefined)
                        newItem.div =  parseFloat(obiekty[i].children[j].attributes.div.nodeValue.replace(",","."));

                    newItem.isPomiar = true;
                    drawingObject.pomiary.push(newItem);
                }                    
            }
            else if(obiekty[i].attributes.typ.nodeValue == "lists") {
                for(j = 0; j < obiekty[i].children.length; j++) {
                    var newItem = {
                        name: undefined, 
                        nameNdef: '--',
                        elements: []
                    };
                    if(obiekty[i].children[j].attributes.name != undefined)
                        newItem.name = obiekty[i].children[j].attributes.name.nodeValue;                                            
                    var elements = Array.from(obiekty[i].children[j].children);
                    elements.forEach(element => {
                        if(element.attributes.name != undefined && element.attributes.value != undefined)
                            var matches = element.attributes.name.nodeValue.matchAll(/@(\d+)@/g);
                            var formatIndexes = [];
                            for (const match of matches) {
                                if(match.length > 0) {
                                    var idx = parseInt(match[1]);
                                    if(idx != undefined) {
                                        formatIndexes.push({index: idx, pos: match.index, len: match[0].length});
                                    }
                                }
                            }
                            newItem.elements.push({
                                name: element.attributes.name.nodeValue, 
                                value: parseInt(element.attributes.value.nodeValue),
                                formatIndexList: formatIndexes
                            });
                    });
                    drawingObject.lists.push(newItem);
                }
            }
            else if(obiekty[i].attributes.typ.nodeValue == "button") {
                for(j = 0; j < obiekty[i].children.length; j++) {
                    var newItem = {
                        width: parseInt(drawingObject.defaults.button.width),
                        height: parseInt(drawingObject.defaults.button.height),
                        nazwa: drawingObject.defaults.button.nazwa,
                        path: drawingObject.defaults.button.plik,
                        color: drawingObject.defaults.button.color,    
                        txtColor: drawingObject.defaults.button.txtColor,
                        fontsize: drawingObject.defaults.button.fontsize,
                        svgSymbol: undefined,
                        users: []
                    };
                    drawingObject.defaults.button.users.forEach(usr => {
                        newItem.users.push(usr);
                    });
                    newItem.x = parseInt(obiekty[i].children[j].attributes.x.nodeValue);
                    newItem.y = parseInt(obiekty[i].children[j].attributes.y.nodeValue);
                    newItem.nazwa = obiekty[i].children[j].attributes.nazwa.nodeValue;

                    if(obiekty[i].children[j].attributes.width != undefined)
                        newItem.width = parseInt(obiekty[i].children[j].attributes.width.nodeValue);
                    if(obiekty[i].children[j].attributes.height != undefined)
                        newItem.height = parseInt(obiekty[i].children[j].attributes.height.nodeValue);
                    if(obiekty[i].children[j].attributes.sizeFont != undefined)
                        newItem.fontsize = parseInt(obiekty[i].children[j].attributes.sizeFont.nodeValue);
                    if(obiekty[i].children[j].attributes.kolorBtn != undefined)
                        newItem.color = obiekty[i].children[j].attributes.kolorBtn.nodeValue;
                    if(obiekty[i].children[j].attributes.kolorFont != undefined)
                        newItem.txtColor = obiekty[i].children[j].attributes.kolorFont.nodeValue;
                    if(obiekty[i].children[j].attributes.plik != undefined)
                        newItem.path = obiekty[i].children[j].attributes.plik.nodeValue;
                    if(obiekty[i].children[j].attributes.ster != undefined)
                        newItem.ster = parseInt(obiekty[i].children[j].attributes.ster.nodeValue);
                    if(obiekty[i].children[j].attributes.ctrl_tag != undefined)
                        newItem.sterTag = obiekty[i].children[j].attributes.ctrl_tag.nodeValue;
                    if(obiekty[i].children[j].attributes.users != undefined) {
                        newItem.users = ['administrator'];
                        var matches = obiekty[i].children[j].attributes.users.nodeValue.matchAll(/\s*([a-zA-z0-9]+)\s*;?/g);
                        for (const match of matches) {
                            if(match.length > 0)
                                newItem.users.push(match[1]);
                        }
                    }
                    newItem.isEventLog = false;
                    newItem.isAlarmList = false;
                    newItem.isLogging = false;
                    if(obiekty[i].children[j].attributes.dziennik_zdarzen != undefined)
                        newItem.isEventLog = true;
                    if(obiekty[i].children[j].attributes.lista_alarmowa != undefined)
                        newItem.isAlarmList = true;
                    if(obiekty[i].children[j].attributes.logowanie != undefined)
                        newItem.isLogging = true;
                    drawingObject.buttons.push(newItem);
                }
            }
            else if(obiekty[i].attributes.typ.nodeValue == "checkbox") {
                for(j = 0; j < obiekty[i].children.length; j++) {
                    var newItem = {
                        fontsize: parseInt(drawingObject.defaults.checkBox.fontsize),
                        width: parseInt(drawingObject.defaults.checkBox.width),
                        height: parseInt(drawingObject.defaults.checkBox.height),
                        bold: drawingObject.defaults.checkBox.bold == "0" ? false : true,
                        color: drawingObject.defaults.checkBox.color
                    };
                    newItem.isCheckBox = true;

                    newItem.x = parseInt(obiekty[i].children[j].attributes.x.nodeValue);
                    newItem.y = parseInt(obiekty[i].children[j].attributes.y.nodeValue);
                    newItem.text = obiekty[i].children[j].attributes.nazwa.nodeValue;

                    if(obiekty[i].children[j].attributes.weL != undefined)
                        newItem.weL = obiekty[i].children[j].attributes.weL.nodeValue;
                    if(obiekty[i].children[j].attributes.weH != undefined)
                        newItem.weH = obiekty[i].children[j].attributes.weH.nodeValue;

                    if(obiekty[i].children[j].attributes.width != undefined)
                        newItem.width = parseInt(obiekty[i].children[j].attributes.width.nodeValue);
                    if(obiekty[i].children[j].attributes.height != undefined)
                        newItem.height = parseInt(obiekty[i].children[j].attributes.height.nodeValue);
                    if(obiekty[i].children[j].attributes.fontsize != undefined)
                        newItem.fontsize = parseInt(obiekty[i].children[j].attributes.fontsize.nodeValue);
                    if(obiekty[i].children[j].attributes.bold != undefined)
                        newItem.bold = (obiekty[i].children[j].attributes.bold.nodeValue == "0" ? false : true);
                    if(obiekty[i].children[j].attributes.kolor != undefined)
                        newItem.color = obiekty[i].children[j].attributes.kolor.nodeValue;
                    drawingObject.checkBox.push(newItem);
                }
            }
        }
        //var linie = [];            
        while(linieBloki.length) {
            var foundBlock = -1;

            if(linieBloki[0].x1 <= linieBloki[0].x2 && linieBloki[0].y1 <= linieBloki[0].y2) {
                drawingObject.linie.unshift({
                    begin: {
                        x: linieBloki[0].x1,
                        y: linieBloki[0].y1
                    },
                    end: {
                        x: linieBloki[0].x2,
                        y: linieBloki[0].y2
                    },
                    color: linieBloki[0].colorStr
                });
            }
            else {
                drawingObject.linie.unshift({
                    begin: {
                        x: linieBloki[0].x2,
                        y: linieBloki[0].y2
                    },
                    end: {
                        x: linieBloki[0].x1,
                        y: linieBloki[0].y1
                    },
                    color: linieBloki[0].colorStr
                });
            }
            var direction = (linieBloki[0].x2 == linieBloki[0].x1 ? 
                "vertical" : (linieBloki[0].y2 - linieBloki[0].y1)/(linieBloki[0].x2 - linieBloki[0].x1));
            linieBloki.shift();
            do {
                var foundIdx = -1;
                var foundBlock = linieBloki.find( function(block) {
                    foundIdx++;       
                    var cmp = (drawingObject.linie[0].begin.x == block.x1 && drawingObject.linie[0].begin.y == block.y1 || drawingObject.linie[0].begin.x == block.x2 && drawingObject.linie[0].begin.y == block.y2 ||
                        drawingObject.linie[0].end.x == block.x1 && drawingObject.linie[0].end.y == block.y1 || drawingObject.linie[0].end.x == block.x2 && drawingObject.linie[0].end.y == block.y2);
                    return cmp && (direction == (block.x2 == block.x1 ? "vertical" : (block.y2 - block.y1)/(block.x2 - block.x1)))
                });
                if(foundBlock != undefined) {
                    if(drawingObject.linie[0].begin.x == foundBlock.x1 && drawingObject.linie[0].begin.y == foundBlock.y1 && foundBlock.x2 <= drawingObject.linie[0].begin.x && foundBlock.y2 <= drawingObject.linie[0].begin.y)                             
                    {                                                                
                        drawingObject.linie[0].begin.x = foundBlock.x2;
                        drawingObject.linie[0].begin.y = foundBlock.y2;
                    }
                    else if(drawingObject.linie[0].begin.x == foundBlock.x2 && drawingObject.linie[0].begin.y == foundBlock.y2 && foundBlock.x1 <= drawingObject.linie[0].begin.x && foundBlock.y1 <= drawingObject.linie[0].begin.y) 
                    {
                        drawingObject.linie[0].begin.x = foundBlock.x1;
                        drawingObject.linie[0].begin.y = foundBlock.y1;
                    }
                    else if(drawingObject.linie[0].end.x == foundBlock.x1 && drawingObject.linie[0].end.y == foundBlock.y1 && foundBlock.x2 >= drawingObject.linie[0].end.x && foundBlock.y2 >= drawingObject.linie[0].end.y) 
                    {
                        drawingObject.linie[0].end.x = foundBlock.x2;
                        drawingObject.linie[0].end.y = foundBlock.y2;
                    }
                    else if(drawingObject.linie[0].end.x == foundBlock.x2 && drawingObject.linie[0].end.y == foundBlock.y2 && foundBlock.x1 >= drawingObject.linie[0].end.x && foundBlock.y1 >= drawingObject.linie[0].end.y)
                    {
                        drawingObject.linie[0].end.x = foundBlock.x1;
                        drawingObject.linie[0].end.y = foundBlock.y1;
                    }
                    linieBloki.splice(foundIdx, 1);
                }
            }
            while(foundBlock != undefined);
        }                
    }
    if(drawingObject.backgroundColor != undefined) {
        document.getElementById("sld").style.backgroundColor = parseColor(drawingObject.backgroundColor);
    }
    drawingObject.linie.forEach( function(linia) {
        var line = svgScheme.line(linia.begin.x, linia.begin.y, linia.end.x, linia.end.y).stroke({color: parseColor(linia.color), width: 2 });
    });            
    drawingObject.teksty.forEach( function(tekst) {
        drawText(tekst);
    });
    drawingObject.pomiary.forEach( function(pomiar) {          
        pomiar.bounding = undefined;             
        pomiar.boundingAnimation = undefined;       
        if(pomiar.list != undefined)
            fillSchemeCombo(pomiar);           
       
    });  

    var strokeWidth = 2;  
    drawingObject.symbol.forEach( function(sym) {
        var svgSymbol = svgScheme.symbol();
        var hGndPattern = svgScheme.pattern(2, 2,  function(add) {
            add.line(0,0,16,0).stroke({color: "#f00", width: 1});
            add.line(0,2,16,2).stroke({color: "#f00", width: 1});
        });
        var vGndPattern = svgScheme.pattern(2, 2,  function(add) {
            add.line(0,0,0,16).stroke({color: "#f00", width: 1});
            add.line(2,0,2,16).stroke({color: "#f00", width: 1});                    
        });                
        switch(sym.type)  {
            case "1":                        
                svgSymbol.line(8,0,8,8).stroke({color: '#F00', width: 1});
                svgSymbol.polygon('2,8 14,8, 8,16').fill(hGndPattern);
            break;
            case "2":                        
                svgSymbol.line(0,8,8,8).stroke({color: '#F00', width: 1});                        
                svgSymbol.polygon('8,2 8,14, 16,8').fill(vGndPattern);
            break;
            case "3":                        
                svgSymbol.line(8,8,16,8).stroke({color: '#F00', width: 1});
                svgSymbol.polygon('0,8 8,2, 8,14').fill(vGndPattern);
            break;
            case "4":                        
                svgSymbol.line(8,8,8,16).stroke({color: '#F00', width: 1});
                svgSymbol.polygon('2,8 8,0, 14,8').fill(hGndPattern);                        
            break;
            case "5":                        
                svgSymbol.line(8,0,8,3).stroke({color: '#F00', width: 1});
                svgSymbol.circle(6).move(5,3).stroke({color: '#F00', width: 1});
                svgSymbol.circle(6).move(5,7).fill('none').stroke({color: '#0080C0', width: 1});
                svgSymbol.line(8,13,8,16).stroke({color: '#0080C0', width: 1});
            break;
            case "6":                        
                svgSymbol.line(8,0,8,3).stroke({color: '#0080C0', width: 1});
                svgSymbol.circle(6).move(5,3).stroke({color: '#0080C0', width: 1});
                svgSymbol.circle(6).move(5,7).fill('none').stroke({color: '#FF0', width: 1});
                svgSymbol.line(8,13,8,16).stroke({color: '#FF0', width: 1});
            break;
            case "101":                        
                svgSymbol.line(24,0,24,9).stroke({color: '#F00', width: strokeWidth});
                svgSymbol.circle(18).move(15,9).stroke({color: '#F00', width: strokeWidth});
                svgSymbol.circle(18).move(15,21).fill('none').stroke({color: '#0080C0', width: strokeWidth});
                svgSymbol.line(24,39,24,48).stroke({color: '#0080C0', width: strokeWidth});
            break;
            case "102":                        
                svgSymbol.line(24,0,24,9).stroke({color: '#808080', width: strokeWidth});
                svgSymbol.circle(18).move(15,9).fill('none').stroke({color: '#808080', width: strokeWidth});
                svgSymbol.circle(18).move(15,21).fill('none').stroke({color: '#F00', width: strokeWidth});
                svgSymbol.line(24,39,24,48).stroke({color: '#F00', width: strokeWidth});
            break;
            case "103":                        
                svgSymbol.line(24,0,24,9).stroke({color: '#0080C0', width: strokeWidth});
                svgSymbol.circle(18).move(15,9).fill('none').stroke({color: '#0080C0', width: strokeWidth});
                svgSymbol.circle(18).move(15,21).fill('none').stroke({color: '#FF0', width: strokeWidth});
                svgSymbol.line(24,39,24,48).stroke({color: '#FF0', width: strokeWidth});
            break;
            case "104":
            case "106":
            case "108":
                var fillColor = "#0080c0";
                if(sym.type == "106")
                fillColor = "#f00";
                else if(sym.type == "108")
                fillColor = "#ff0";
                svgSymbol.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                svgSymbol.rect(24, 24).fill("#808080").move(12,12);
            break;
            case "105":
            case "107":
            case "109":
                var fillColor = "#0080c0";
                if(sym.type == "107")
                fillColor = "#f00";
                else if(sym.type == "109")
                fillColor = "#ff0";
                svgSymbol.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                svgSymbol.rect(24, 24).fill("#808080").move(12,12);
            break;
        };
        svgScheme.use(svgSymbol).move(sym.x, sym.y);

    });
    drawingObject.tele.forEach( function(tmech) {
        switch(tmech.type)  {
            case "1":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: 2});
                tmech.svgSymbol.state10.rect(8, 8).fill("#f00").move(4,4);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.line(8, 0, 8, 16).stroke({width: 2});
                tmech.svgSymbol.state01.rect(8, 8).fill("#0f0").move(4,4);

                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.line(8, 0, 8, 16).stroke({width: 2});
                tmech.svgSymbol.state11.rect(8, 8).fill("#FFF").move(4,4);

                tmech.svgSymbol.state00 =  tmech.svgSymbol.state11;
            break;
            case "2":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: 2});
                tmech.svgSymbol.state10.circle(8).fill("#f00").cx(8).cy(8);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.line(8, 0, 8, 16).stroke({width: 2});
                tmech.svgSymbol.state01.circle(8).fill("#0f0").cx(8).cy(8);

                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.line(8, 0, 8, 16).stroke({width: 2});
                tmech.svgSymbol.state11.circle(8).fill("#FFF").cx(8).cy(8);

                tmech.svgSymbol.state00 = tmech.svgSymbol.state11;
            break;
            case "3":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(0, 8, 8, 8).stroke({width: 2});
                tmech.svgSymbol.state10.polygon("8,4 8,12 16,8").fill("#dd0");

                tmech.svgSymbol.state01 = tmech.svgSymbol.state10;
                tmech.svgSymbol.state11 = tmech.svgSymbol.state10;
                tmech.svgSymbol.state00 = tmech.svgSymbol.state10;
            break;
            case "4":
            case "10":               
                var rotateValue = 0;
                if(tmech.type == "10")
                    rotateValue = 90;
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: strokeWidth}).rotate(rotateValue);
                tmech.svgSymbol.state10.rect(12, 12).fill(drawingObject.backgroundColor).stroke({width: strokeWidth}).move(2,2);
                tmech.svgSymbol.state10.line(8,2,8,14).stroke({width: strokeWidth}).rotate(rotateValue);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.line(8, 0, 8, 16).stroke({width: strokeWidth}).rotate(rotateValue);                                    
                tmech.svgSymbol.state01.rect(12, 12).fill(drawingObject.backgroundColor).stroke({width: strokeWidth}).move(2,2);
                tmech.svgSymbol.state01.line(2, 8, 14, 8).stroke({width: strokeWidth}).rotate(rotateValue);

                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.line(8, 0, 8, 16).stroke({width: strokeWidth}).rotate(rotateValue);
                tmech.svgSymbol.state11.rect(12, 12).fill(drawingObject.backgroundColor).stroke({width: strokeWidth}).move(2,2);                        
                tmech.svgSymbol.state11.line(2, 14, 14, 2).stroke({width: strokeWidth});

                tmech.svgSymbol.state00 =  tmech.svgSymbol.state11;
            break;
            case "5":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.circle(12).stroke({width: 2}).cx(8).cy(8).fill("none");
                tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: 2});

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.circle(12).stroke({width: 2}).cx(8).cy(8).fill("none");
                tmech.svgSymbol.state01.line(0, 8, 16, 8).stroke({width: 2});

                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.circle(12).stroke({width: 2}).cx(8).cy(8).fill("none");
                tmech.svgSymbol.state11.line(0, 0, 16, 16).stroke({width: 2});

                tmech.svgSymbol.state00 = tmech.svgSymbol.state11;
            break;
            case "7":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(0, 8, 16, 8).stroke({width: 2});
                tmech.svgSymbol.state10.rect(8, 8).fill("#f00").move(4,4);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.line(0, 8, 16, 8).stroke({width: 2});
                tmech.svgSymbol.state01.rect(8, 8).fill("#0f0").move(4,4);

                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.line(0, 8, 16, 8).stroke({width: 2});
                tmech.svgSymbol.state00.rect(8, 8).fill("#FFF").move(4,4);

                tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
            break;
            case "8":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(0, 8, 16, 8).stroke({width: 2});
                tmech.svgSymbol.state10.circle(8).fill("#f00").cx(8).cy(8);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.line(0, 8, 16, 8).stroke({width: 2});
                tmech.svgSymbol.state01.circle(8).fill("#0f0").cx(8).cy(8);

                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.line(0, 8, 16, 8).stroke({width: 2});
                tmech.svgSymbol.state00.circle(8).fill("#FFF").cx(8).cy(8);

                tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
            break;
            case "9":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(8, 0, 8, 8).stroke({width: 2});
                tmech.svgSymbol.state10.polygon("4,8 12,8 8,16").fill("#dd0");

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.line(8, 0, 8, 8).stroke({width: 2});
                tmech.svgSymbol.state01.polygon("4,8 12,8 8,16").fill("#0f0");

                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.line(8, 0, 8, 8).stroke({width: 2});
                tmech.svgSymbol.state00.polygon("4,8 12,8 8,16").fill("#FFF");

                tmech.svgSymbol.state11 = tmech.svgSymbol.state01;
            break;
            case "11":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(8, 0, 8, 2).stroke({width: 2});
                tmech.svgSymbol.state10.line(8, 14, 8, 16).stroke({width: 2});
                tmech.svgSymbol.state10.rect(8, 8).fill("#f00").move(4,4);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.line(8, 0, 8, 2).stroke({width: 2});
                tmech.svgSymbol.state01.line(8, 14, 8, 16).stroke({width: 2});
                tmech.svgSymbol.state01.rect(8, 8).fill("#0f0").move(4,4);

                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.line(8, 0, 8, 2).stroke({width: 2});
                tmech.svgSymbol.state00.line(8, 14, 8, 16).stroke({width: 2});
                tmech.svgSymbol.state00.rect(8, 8).fill("#FFF").move(4,4);

                tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
            break;
            case "12":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(0, 8, 2, 8).stroke({width: 2});
                tmech.svgSymbol.state10.line(14, 8, 16, 8).stroke({width: 2});
                tmech.svgSymbol.state10.rect(8, 8).fill("#f00").move(4,4);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.line(0, 8, 2, 8).stroke({width: 2});
                tmech.svgSymbol.state01.line(14, 8, 16, 8).stroke({width: 2});
                tmech.svgSymbol.state01.rect(8, 8).fill("#0f0").move(4,4);

                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.line(0, 8, 2, 8).stroke({width: 2});
                tmech.svgSymbol.state00.line(14, 8, 16, 8).stroke({width: 2});
                tmech.svgSymbol.state00.rect(8, 8).fill("#FFF").move(4,4);

                tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
            break;
            case "13":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.rect(32, 32).fill(drawingObject.backgroundColor).move(-8,-8);
                tmech.svgSymbol.state10.rect(12, 12).fill("#f00").move(2,2).radius(2);                            

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.rect(32, 32).fill(drawingObject.backgroundColor).move(-8,-8);
                tmech.svgSymbol.state01.rect(12, 12).fill("#0f0").move(2,2).radius(2);                            

                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.rect(32, 32).fill(drawingObject.backgroundColor).move(-8,-8);
                tmech.svgSymbol.state00.rect(12, 12).fill("#FFF").move(2,2).radius(2);                            

                tmech.svgSymbol.state11 = tmech.svgSymbol.state00;
            break;
            case "14":
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.circle(12).fill("#f00").cx(8).cy(8);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.circle(12).fill(drawingObject.backgroundColor).stroke({color: "#0f0", width: strokeWidth}).cx(8).cy(8);

                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.circle(12).fill(drawingObject.backgroundColor).stroke({color: "#AAA", width: strokeWidth}).cx(8).cy(8);

                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.circle(12).fill("#AAA").cx(8).cy(8);
            break;                    
            case "23":
            case "24":
            case "25":
            case "26":
                var fillColor = "#f00";
                if(tmech.type == "24")
                fillColor = "#0080c0";
                else if(tmech.type == "25")
                fillColor = "#ff0";
                else if(tmech.type == "26")
                fillColor = "#000";

                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.line(8, 0, 8, 16).stroke({width: 1, color: fillColor});
                tmech.svgSymbol.state10.rect(8, 8).fill(fillColor).move(4,4);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.line(8, 0, 8, 16).stroke({width: 1, color: fillColor});
                tmech.svgSymbol.state01.rect(8, 8).stroke({color: fillColor}).move(4,4);

                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.line(8, 0, 8, 4).stroke({width: 1, color: fillColor});
                tmech.svgSymbol.state11.line(8, 12, 8, 16).stroke({width: 1, color: fillColor});                        
                tmech.svgSymbol.state11.line(4, 4, 12, 12).stroke({width: 1, color: fillColor});
                tmech.svgSymbol.state11.line(12, 4, 4, 12).stroke({width: 1, color: fillColor});         
            
                tmech.svgSymbol.state00 = tmech.svgSymbol.state11;

                tmech.svgSymbol.state10unav = svgScheme.symbol();
                tmech.svgSymbol.state10unav.line(8, 0, 8, 16).stroke({width: 1, color: fillColor});
                tmech.svgSymbol.state10unav.rect(8, 8).fill("#f0f").move(4,4);

                tmech.svgSymbol.state01unav = svgScheme.symbol();
                tmech.svgSymbol.state01unav.line(8, 0, 8, 16).stroke({width: 1, color: fillColor});
                tmech.svgSymbol.state01unav.rect(8, 8).stroke({color: "#f0f"}).move(4,4);
            break;
            case "27":
            case "28":
            case "29":
                var fillColor = "#f00";
                if(tmech.type == "28")
                    fillColor = "#0080c0";
                else if(tmech.type == "29")
                    fillColor = "#ff0";
                else if(tmech.type == "30")
                    fillColor = "#000";
                tmech.svgSymbol.state10 = svgScheme.symbol();

                tmech.svgSymbol.state10.circle(12).fill("#f00").cx(8).cy(8);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.circle(12).fill(drawingObject.backgroundColor).stroke({color: "#0f0", width: strokeWidth}).cx(8).cy(8);

                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.circle(12).fill(drawingObject.backgroundColor).stroke({color: "#AAA", width: strokeWidth}).cx(8).cy(8);

                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.circle(12).fill("#AAA").cx(8).cy(8);
            break;
            case "30":
            case "107":
                //auto zal
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.rect(16, 16).fill("#f00");                        
                tmech.svgSymbol.state10.line(0, 8, 4, 8).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state10.line(12, 8, 16, 8).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state10.line(4, 4, 4, 12).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state10.line(12, 4, 12, 12).stroke({width: strokeWidth/2});
                //reka wyl
                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.rect(16, 16).fill("#0f0");          
                tmech.svgSymbol.state01.rect(14, 14).fill("none").stroke({color: "#00f", width: strokeWidth}).move(strokeWidth/2,strokeWidth/2);              
                tmech.svgSymbol.state01.line(0, 8, 4, 8).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state01.line(12, 8, 16, 8).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state01.line(4, 4, 4, 12).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state01.line(12, 4, 12, 12).stroke({width: strokeWidth/2});
                //reka zal 
                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.rect(16, 16).fill("#f00");
                tmech.svgSymbol.state11.rect(14, 14).fill("none").stroke({color: "#00f", width: strokeWidth}).move(strokeWidth/2,strokeWidth/2);
                tmech.svgSymbol.state11.line(0, 8, 4, 8).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state11.line(12, 8, 16, 8).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state11.line(4, 4, 4, 12).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state11.line(12, 4, 12, 12).stroke({width: strokeWidth/2});
                //auto wyl
                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.rect(16, 16).fill("#0f0");                                         
                tmech.svgSymbol.state00.line(0, 8, 4, 8).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state00.line(12, 8, 16, 8).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state00.line(4, 4, 4, 12).stroke({width: strokeWidth/2});
                tmech.svgSymbol.state00.line(12, 4, 12, 12).stroke({width: strokeWidth/2});

                if(tmech.sterLname == undefined || tmech.sterLname == "" || tmech.sterLname == tmech.sterL)
                    tmech.sterLname = "Załącz";
                if(tmech.sterHname == undefined || tmech.sterHname == "" || tmech.sterHname == tmech.sterH)
                    tmech.sterHname = "Wyłącz";                                
                if(tmech.sterAname == undefined || tmech.sterAname == "" || tmech.sterAname == tmech.sterA)
                    tmech.sterAname = "Auto";
                if(tmech.sterRname == undefined || tmech.sterRname == "" || tmech.sterRname == tmech.sterR)
                    tmech.sterRname = "Manual";
                
                if(tmech.type == "107") {
                    tmech.svgSymbol.state10.each(  function(i, children) {
                        this.scale(3,3,0,0)
                    });
                    tmech.svgSymbol.state01.each( function(i, children) {
                        this.scale(3,3,0,0)
                    });
                    tmech.svgSymbol.state11.each( function(i, children) {
                        this.scale(3,3,0,0)
                    });
                    tmech.svgSymbol.state00.each( function(i, children) {
                        this.scale(3,3,0,0)
                    });
                }

            break;   
            case "31":   
            case "108":
                //zal            
                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.rect(16, 16).fill("#f00");
                tmech.svgSymbol.state10.rect(14, 14).fill("none").stroke({color: "#00f", width: strokeWidth}).move(strokeWidth/2,strokeWidth/2);
                tmech.svgSymbol.state10.path('M0 10 L4 10 A2.5 2.5 0 1 1 7 10 A2.5 2.5 0 1 1 10 10 A2.5 2.5 0 1 1 13 10 L16 10').fill('none').stroke({width: strokeWidth/2});
                //auto wyl
                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.rect(16, 16).fill("#0f0");                                         
                tmech.svgSymbol.state01.path('M0 10 L4 10 A2.5 2.5 0 1 1 7 10 A2.5 2.5 0 1 1 10 10 A2.5 2.5 0 1 1 13 10 L16 10').fill('none').stroke({width: strokeWidth/2});
                //auto zal
                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.rect(16, 16).fill("#f00");                        
                tmech.svgSymbol.state11.path('M0 10 L4 10 A2.5 2.5 0 1 1 7 10 A2.5 2.5 0 1 1 10 10 A2.5 2.5 0 1 1 13 10 L16 10').fill('none').stroke({width: strokeWidth/2});
                //wyl                        
                tmech.svgSymbol.state00 = svgScheme.symbol();
                tmech.svgSymbol.state00.rect(16, 16).fill("#0f0");           
                tmech.svgSymbol.state00.rect(14, 14).fill("none").stroke({color: "#00f"}).move(strokeWidth/2,strokeWidth/2);
                tmech.svgSymbol.state00.path('M0 10 L4 10 A2.5 2.5 0 1 1 7 10 A2.5 2.5 0 1 1 10 10 A2.5 2.5 0 1 1 13 10 L16 10').fill('none').stroke({width: strokeWidth/2});
                if(tmech.type == "108") {
                    tmech.svgSymbol.state10.each( function(i, children) {
                        this.scale(3,3,0,0)
                    });
                    tmech.svgSymbol.state01.each( function(i, children) {
                        this.scale(3,3,0,0)
                    });
                    tmech.svgSymbol.state11.each( function(i, children) {
                        this.scale(3,3,0,0)
                    });
                    tmech.svgSymbol.state00.each( function(i, children) {
                        this.scale(3,3,0,0)
                    });
                }
            break;                    
            case "101":
            case "103":
            case "105":
                var fillColor = "#0080c0";
                if(tmech.type == "103")
                fillColor = "#f00";
                else if(tmech.type == "105")
                fillColor = "#ff0";

                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state10.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state10.rect(24, 24).fill("#080").move(12,12);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state01.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state01.rect(24, 24).stroke({color: "#080", width: strokeWidth}).move(12,12);

                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state11.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state11.line(12, 12, 36, 36).stroke({width: strokeWidth, color: "#f00"});
                tmech.svgSymbol.state11.line(36, 12, 12, 36).stroke({width: strokeWidth, color: "#f00"});        
            
                tmech.svgSymbol.state00 = tmech.svgSymbol.state11;

                tmech.svgSymbol.state10unav = svgScheme.symbol();
                tmech.svgSymbol.state10unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state10unav.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state10unav.rect(24, 24).fill("#f0f").move(12,12);

                tmech.svgSymbol.state01unav = svgScheme.symbol();
                tmech.svgSymbol.state01unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state01unav.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state01unav.rect(24, 24).stroke({color: "#f0f", width: strokeWidth}).move(12,12);

                tmech.svgSymbol.state11unav = svgScheme.symbol();
                tmech.svgSymbol.state11unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state11unav.line(24, 0, 24, 48).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state11unav.line(12, 12, 36, 36).stroke({width: strokeWidth, color: "#f0f"});
                tmech.svgSymbol.state11unav.line(36, 12, 12, 36).stroke({width: strokeWidth, color: "#f0f"});

                tmech.svgSymbol.stateNone = svgScheme.symbol();
                tmech.svgSymbol.stateNone.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
            break;
            case "102":
            case "104":
            case "106":
                var fillColor = "#0080c0";
                if(tmech.type == "104")
                fillColor = "#f00";
                else if(tmech.type == "106")
                fillColor = "#ff0";

                tmech.svgSymbol.state10 = svgScheme.symbol();
                tmech.svgSymbol.state10.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state10.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state10.rect(24, 24).fill("#080").move(12,12);

                tmech.svgSymbol.state01 = svgScheme.symbol();
                tmech.svgSymbol.state01.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state01.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state01.rect(24, 24).stroke({color: "#080", width: strokeWidth}).move(12,12);

                tmech.svgSymbol.state11 = svgScheme.symbol();
                tmech.svgSymbol.state11.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state11.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state11.line(12, 12, 36, 36).stroke({width: strokeWidth, color: "#f00"});
                tmech.svgSymbol.state11.line(36, 12, 12, 36).stroke({width: strokeWidth, color: "#f00"});

                tmech.svgSymbol.state00 = tmech.svgSymbol.state11;

                tmech.svgSymbol.state10unav = svgScheme.symbol();
                tmech.svgSymbol.state10unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state10unav.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state10unav.rect(24, 24).fill("#f0f").move(12,12);

                tmech.svgSymbol.state01unav = svgScheme.symbol();
                tmech.svgSymbol.state10unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state01unav.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state01unav.rect(24, 24).stroke({color: "#f0f", width: strokeWidth}).move(12,12);

                tmech.svgSymbol.state11unav = svgScheme.symbol();
                tmech.svgSymbol.state11unav.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
                tmech.svgSymbol.state11unav.line(0, 24, 48, 24).stroke({width: strokeWidth, color: fillColor});
                tmech.svgSymbol.state11unav.line(12, 12, 36, 36).stroke({width: strokeWidth, color: "#f0f"});
                tmech.svgSymbol.state11unav.line(36, 12, 12, 36).stroke({width: strokeWidth, color: "#f0f"});

                tmech.svgSymbol.stateNone = svgScheme.symbol();
                tmech.svgSymbol.stateNone.rect(48, 48).fill({color: drawingObject.backgroundColor, opacity: 0});
            break;
        }
        if(tmech.svgSymbol != undefined) {       
            tmech.bounding = undefined;             
            tmech.boundingAnimation = undefined;    
            

            var foundL = false, foundH = (tmech.weH == undefined ? true : false)
            if(currentScheme != undefined && statesForSchemes[currentScheme] != undefined && statesForSchemes[currentScheme].binary != undefined) {
                for (var binI = 0; binI < statesForSchemes[currentScheme].binary.length; binI++ ) {
                    if(tmech.weL == statesForSchemes[currentScheme].binary[binI].index) {
                        tmech.stateL = parseInt(statesForSchemes[currentScheme].binary[binI].state, 16);
                        foundL = true;
                    }
                    if(tmech.weH == statesForSchemes[currentScheme].binary[binI].index) {
                        tmech.stateH = parseInt(statesForSchemes[currentScheme].binary[binI].state, 16);
                        foundH = true;
                    } 
                }
                if(foundL && foundH)
                    fillSchemeTele(tmech);   
            }
            if(!foundL || !foundH) {
                if(tmech.svgSymbol.state01unav != undefined)
                    tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state01unav).move(tmech.x, tmech.y);
                else if(tmech.svgSymbol.stateNone != undefined)
                    tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.stateNone).move(tmech.x, tmech.y);
                else
                    tmech.svgSymbol.used = svgScheme.use(tmech.svgSymbol.state00).move(tmech.x, tmech.y);                        
            }
            if(tmech.sterL != undefined || tmech.sterH != undefined || tmech.enableSetH != undefined || tmech.enableSetL != undefined)
                AttachMouseBoundingAnimation(tmech, tmech.svgSymbol.used);                                     
        }
    });
    
    //addZoomButtons();
    
    drawingObject.buttons.forEach( function(button) {
        addButtonToScheme(button);
    });                
    drawingObject.checkBox.forEach(chbox => {fillSchemeCheckBox(chbox)});    //wypełnienie defaultem

    var maxx, maxy;
    svgScheme.children().forEach(element => {
        if(maxx == undefined || element.x() > maxx)
            maxx = element.x();
        if(maxy == undefined || element.y() > maxy)
            maxy = element.y();
    });            
    drawingObject.buttons.forEach(button => {
        if(button.path == "ZOOM+") {
            button.svgSymbol.move(maxx / 2 - 50, maxy + 50);
        }
        else if(button.path == "ZOOM-") {
            button.svgSymbol.move(maxx / 2 + 50, maxy + 50);
        }
    });
}


  


const countries = async () =>{
  
    const response = await fetch("./S33_1.xml")
    
    const data = await response.text()
    console.log (data)
    return data
  }

  const convert = async () =>{
    const response = await countries()
    const parser = new DOMParser();

    xmlToSvg( parser.parseFromString(response, "text/xml"))
  }


  convert()

