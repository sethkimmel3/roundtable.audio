$( document ).ready(function() {
            
    var chat_window_id = "chat-window";
    var notification_icon_id = "notification-icon";
    var send_message_icon_id = "send-message-icon";
    var chat_form_id = "chat-form";
    var chat_window_input_id = "chat-window-input";
    var chat_messages_container_id = "chat-messages-container";
    
    var notification_color = '#8590AA';
    var table_outer_color = '#C4DBF6';
    var user_seat_color = '#B23850';
    var others_seat_color = '#E7E3D4';
    var speaking_color = '#3B8BEB';

    var window_width = $(window).width();
    var window_height = $(window).height();
    
    
    $('#' + notification_icon_id).hide();
    $('#' + chat_window_id).hide();
    $('#' + send_message_icon_id).hide();
    
    $.fn.addNotificationCircle = function(){
        if($('#' + chat_window_id).is(':hidden')){
            $('#' + notification_icon_id).show();
        }
    }
    
    $.fn.removeNotificationCircle = function(){
        $('#' + notification_icon_id).hide();
    }
     
    $.fn.toggleChatWindow = function(){
        if($('#' + chat_window_id).is(':hidden')){
            if($('#' + notification_icon_id).is(':visible')){
                $('#' + notification_icon_id).hide();
            }
            $('#' + chat_window_id).show();
            $("#" + chat_messages_container_id).scrollTop($("#" + chat_messages_container_id)[0].scrollHeight);
        }else{
            $('#' + chat_window_id).hide();
        }
    }
    
    $(document).on('submit', '#' + chat_form_id, function(e){
        e.preventDefault();
    });
    
    $('#' + chat_window_input_id).on('keyup', function(e){
        if($('#' + chat_window_input_id).val().length > 0){
            $('#' + send_message_icon_id).show();
            
            // create hidden span and measure width to determine whether or not to make the send icon opaque
            var span = document.createElement('span');
            span.innerHTML = $('#' + chat_window_input_id).val();
            span.style = "visibility:hidden;";
            span.id = 'dummySpan';
            document.getElementById(chat_window_id).appendChild(span);
            var textWidth = parseInt($('#dummySpan').css('width'), 10);
            document.getElementById(chat_window_id).removeChild(span);
            var chatWidth = $('#' + chat_window_input_id).width();
            
            if(textWidth/chatWidth > 0.92){
                $('#' + send_message_icon_id).css('opacity', 0.50);
            }else{
                $('#' + send_message_icon_id).css('opacity', 1.0);
            }
            
            if (e.key === 'Enter' || e.keyCode === 13) {
                $.fn.sendMessage();
            }
            
        }else{
            $('#' + send_message_icon_id).hide();
        }
    });
    
    $.fn.addNewMessage = function(isParticipant, isUser, nickname, id, message){
        var to_add = document.createElement('p');
        to_add.classList.add('chatMessage');
        to_add.dataset.user_id = id;
        to_add.dataset.is_participant = isParticipant;
        
        if(isParticipant){
            to_add.style.color = '#3B8BEB';
        }else{
            to_add.style.color = 'grey';
        }
        
        if(isUser){
            to_add.style.textAlign = 'right';
            to_add.style.color = '#B23850';
        }else{
            to_add.style.textAlign = 'left';
        }
        
        var urls = message.match(/(?:(?:https?|ftp):\/\/|\b(?:[a-z\d]+\.))(?:(?:[^\s()<>]+|\((?:[^\s()<>]+|(?:\([^\s()<>]+\)))?\))+(?:\((?:[^\s()<>]+|(?:\(?:[^\s()<>]+\)))?\)|[^\s`!()\[\]{};:'".,<>?«»“”‘’]))?/ig);
        
        if(urls != null){
            for(var i = 0; i < urls.length; i++){
                var url = urls[i];
                if(!url.endsWith('.')){
                    if(!(url.includes('http://') || url.includes('https://'))){
                        var link = 'http://' + url;
                    }else{
                        var link = url;
                    }
                    var linktag = '<a href="' + link + '" target="_blank" style="color:inherit;text-decoration:underline;">' + url + '</a>';
                    message = message.replace(url, linktag);
                }
            }
        }
        
        to_add.innerHTML = message + '<br><small>' + nickname + '</small>';
        
        document.getElementById(chat_messages_container_id).appendChild(to_add);
        $("#" + chat_messages_container_id).scrollTop($("#" + chat_messages_container_id)[0].scrollHeight);
    }
}); 