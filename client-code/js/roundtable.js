$( document ).ready(function() {
            
    var canvas_id = "roundtable";
    var table_inner_color = '#8590AA';
    var table_outer_color = '#C4DBF6';
    var user_seat_color = '#B23850';
    var others_seat_color = '#E7E3D4';
    var highlighted_color = '#bfd9bf';
    var speaking_color = '#3B8BEB';
    var non_speaking_color = 'grey'; 
    var chat_notification_color = '#B23850';

    var window_width = $(window).width();
    var window_height = $(window).height();
    var roundtable_width = window_width/3;
    var roundtable_height = window_width/3;
    var c = document.getElementById(canvas_id);
    c.width = roundtable_width;
    c.height = roundtable_height;

    let rect = c.getBoundingClientRect();

    var scale = window.devicePixelRatio;
    c.width = rect.width * scale;
    c.height = rect.height * scale;

    var ctx = c.getContext("2d");
    ctx.scale(scale, scale);

    c.style.width = rect.width + 'px';
    c.style.height = rect.height + 'px';

    var outerRadius = roundtable_width/2.8;

    var seats = [];

    var steps = 50;
    var listeners = 0;
    var listenersChatNotificationCount = 0;
    var pulseVal;

    function draw(){

        ctx.clearRect(0, 0, c.width, c.height);

        ctx.beginPath();
        ctx.arc(roundtable_width/2, roundtable_width/2, outerRadius, 0, 2 * Math.PI);
        ctx.lineWidth = 10;
        ctx.fillStyle = table_inner_color;
        ctx.strokeStyle = table_outer_color;
        ctx.fill();
        ctx.stroke();
        ctx.font = '28px Arial';
        ctx.fillStyle = 'black';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        if(listeners == 1){
            var listeners_text = ' Listener';
        }else{
            var listeners_text = ' Listeners';
        }
        ctx.fillText('+' + listeners.toString() + listeners_text, roundtable_width/2, roundtable_width/2);
        ctx.textBaseline = 'middle';
        if(listenersChatNotificationCount > 0){
            ctx.beginPath();
            ctx.arc(roundtable_width/2, roundtable_width/2 + 30, 15, 0, 2 * Math.PI);
            ctx.fillStyle = chat_notification_color;
            ctx.fill();
            ctx.font = '12px Arial';
            ctx.fillStyle = 'black';
            ctx.fillText(listenersChatNotificationCount.toString(), roundtable_width/2, roundtable_width/2 + 30);
        }

        for(var i = 0; i < seats.length; i++){
            seat = seats[i];
            currentAngle = seat["currentAngle"];
            destAngle = seat["destAngle"];
            if(Math.abs(destAngle - currentAngle) > 0.01){
                moving = true;
                step = (destAngle - currentAngle)/steps;
                var xPos = roundtable_width/2 + outerRadius*Math.cos(currentAngle + step);
                var yPos = roundtable_width/2 + outerRadius*Math.sin(currentAngle + step);
                seat["currentAngle"] = currentAngle + step;
            }else{
                var xPos = roundtable_width/2 + outerRadius*Math.cos(currentAngle);
                var yPos = roundtable_width/2 + outerRadius*Math.sin(currentAngle);
            }
            ctx.beginPath();
            var radius = roundtable_width/(8 + 3*Math.atan(seats.length/5));
            ctx.arc(xPos, yPos, radius, 0, 2 * Math.PI);
            ctx.lineWidth = 5;
            if(seat["highlighted"]){
                ctx.fillStyle = highlighted_color;
            }else{
                ctx.fillStyle = seat["color"];
            }
            ctx.fill();
            ctx.strokeStyle = non_speaking_color;
            ctx.stroke();
            ctx.font = '18px Arial';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(seat["name"], xPos, yPos);
            // add chat Notification Count
            if(seat["chatNotificationCount"] > 0){
                ctx.beginPath();
                ctx.arc(xPos + radius - 15, yPos - radius + 15, 15, 0, 2 * Math.PI);
                ctx.fillStyle = chat_notification_color;
                ctx.fill();
                ctx.font = '12px Arial';
                ctx.fillStyle = 'black';
                ctx.fillText(seat["chatNotificationCount"].toString(), xPos + radius - 15, yPos - radius + 15);
            }
            
           for(var j = 15; j > -1; j--){
               pulseVal = seat["audioPulses"][j];
               if(pulseVal > 0.0){
                   active_pulses = true;
                   var minRadius = roundtable_width/(8 + 3*Math.atan(seats.length/5));
                   var maxRadius = 1.15*(roundtable_width/(8 + 3*Math.atan(seats.length/5)));
                   var radius = minRadius + (j/16)*(maxRadius - minRadius);
                   ctx.beginPath();
                   ctx.arc(xPos, yPos, radius, 0, 2 * Math.PI);
                   ctx.lineWidth = 0.1*pulseVal;
                   //ctx.lineWidth = 5*Math.log(pulseVal + 1);
                   ctx.strokeStyle = speaking_color;
                   ctx.globalAlpha = 1 - (j/16);
                   ctx.stroke();
                   ctx.globalAlpha = 1;
               }
               if(j != 0){
                   seat["audioPulses"][j] = seat["audioPulses"][j - 1];
               }else{
                   seat["audioPulses"][0] = 0;
               }
           }
        }
        window.requestAnimationFrame(draw);
    }

    function addSeat(name, id, isUser){
        if(isUser){
            var seatColor = user_seat_color;
        }else{
            var seatColor = others_seat_color;
        }
        var seat = {
            "name": name,
            "id": id,
            "isUser": isUser,
            "isMuted": false,
            "highlighted": false,
            "audioPulses": new Array(16).fill(0), //Length-16 Int Array represents time-series of audio pulses
            "color": seatColor,
            "currentAngle": 0,
            "destAngle": 0,
            "chatNotificationCount": 0
        }
        if(isUser){
            seats.unshift(seat);
        }else{
            seats.push(seat);
        }

        for(var i = 0; i < seats.length; i++){
            if(seats[i]["isUser"]){
                var posRadiansOld = Math.PI/2;
                var posRadiansNew = Math.PI/2;
            }else{
                if(seats.length < 2){
                    var posRadiansOld = -Math.PI/2;
                    var posRadiansNew = -Math.PI/2;
                }
                else{
                    var posRadiansOld = -Math.PI/2 + i*(2*Math.PI/(seats.length - 1));
                    var posRadiansNew = Math.PI/2 + i*(2*Math.PI/(seats.length));
                }
            }
            seats[i]["currentAngle"] = posRadiansOld;
            seats[i]["destAngle"] = posRadiansNew;
        }
    }

    function removeSeat(id){
        for(var i = 0; i < seats.length; i++){
            if(seats[i]["id"] == id){
                seats.splice(i, 1);
            }
        }
        for(var i = 0; i < seats.length; i++){
            if(seats[i]["isUser"]){
                var posRadiansOld = Math.PI/2;
                var posRadiansNew = Math.PI/2;
            }else{
                var posRadiansOld = Math.PI/2 + i*(2*Math.PI/(seats.length + 1));
                var posRadiansNew = Math.PI/2 + i*(2*Math.PI/(seats.length));
            }
            seats[i]["currentAngle"] = posRadiansOld;
            seats[i]["destAngle"] = posRadiansNew;
        }
    }

    $.fn.addSeat = function(name, id, isUser){
        var index = seats.indexOf(id);
        if(index == -1){
            addSeat(name, id, isUser);
        }
    }

    $.fn.removeSeat = function(id){
        removeSeat(id);
    }
    
    $.fn.updateListeners = function(num){
        listeners = num;
    }

    $.fn.addAudioPulse = function(id, value){
        var seat = seats.find(x => x.id === id);
        if(seat != undefined){
            seat["audioPulses"][0] = value;
        }
    }
    
    $.fn.updateChatNotificationCount = function(listeners, id){
        if(listeners){
            listenersChatNotificationCount += 1;
        }
        else{
            var seat = seats.find(x => x.id === id);
            seat["chatNotificationCount"] += 1;
        }
    }
    
    $.fn.resetAllChatNotificationCounts = function(){
        for(var i=0; i < seats.length; i++){
            seats[i]["chatNotificationCount"] = 0;
        }
        listenersChatNotificationCount = 0;
    }
    
    $.fn.updateHighlight = function(id, value){
        var seat = seats.find(x => x.id === id);
        seat["highlighted"] = value; 
    }
    
    window.requestAnimationFrame(draw);
}); 