$( document ).ready(function() {
            
    var canvas_id = "roundtable";
    var table_inner_color = '#8590AA';
    var table_outer_color = '#C4DBF6';
    var user_seat_color = '#B23850';
    var others_seat_color = '#E7E3D4';
    var speaking_color = '#3B8BEB';
    var non_speaking_color = 'grey';

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
    var moving = false;
    var listeners = 0;
    var speaking = [];

    function draw(){
        moving = false;

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
        ctx.fillText(listeners.toString() + ' Listeners', roundtable_width/2, roundtable_width/2);
        ctx.textBaseline = 'middle';

        for(var i = 0; i < seats.length; i++){
            seat = seats[i];
            currentAngle = seat["currentAngle"];
            destAngle = seat["destAngle"];
            step = (destAngle - currentAngle)/steps;
            var xPos = roundtable_width/2 + outerRadius*Math.cos(currentAngle + step);
            var yPos = roundtable_width/2 + outerRadius*Math.sin(currentAngle + step);
            seat["currentAngle"] = currentAngle + step;
            ctx.beginPath();
            ctx.arc(xPos, yPos, roundtable_width/(8 + 3*Math.atan(seats.length/5)), 0, 2 * Math.PI);
            ctx.lineWidth = 5;
            ctx.fillStyle = seat["color"];
            ctx.fill();
            if(speaking.includes(seat["id"])){
                ctx.strokeStyle = speaking_color;
            }else{
                ctx.strokeStyle = non_speaking_color;
            }
            ctx.stroke();
            ctx.font = '18px Arial';
            ctx.fillStyle = 'black';
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText(seat["name"], xPos, yPos);
            if(Math.abs(destAngle - currentAngle) > 0.01){
                moving = true;
            }
        }
        if(moving){
            window.requestAnimationFrame(draw);
        }
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
            "color": seatColor,
            "currentAngle": 0,
            "destAngle": 0
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
        if(!moving){
            window.requestAnimationFrame(draw);
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
        if(!moving){
            window.requestAnimationFrame(draw);
        }
    }

    $.fn.addSeat = function(name, id, isUser){
        //var name = seats.length.toString();
        addSeat(name, id, isUser);
    }

    $.fn.removeSeat = function(id){
        //var name = Math.floor(Math.random() * seats.length).toString();
        removeSeat(id);
    }
    
    $.fn.updateListeners = function(num){
        listeners = num;
        draw();
    }
    
    $.fn.addToSpeaking = function(id){
        speaking.push(id);
        draw();
    }
    
    $.fn.removeFromSpeaking = function(id){
        var index = speaking.indexOf(id);
        if(index > -1){
            speaking.splice(index, 1);
        }
        draw();
    }

    window.requestAnimationFrame(draw);
}); 