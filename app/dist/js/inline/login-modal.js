$(function () {
    $("#loginDialog .swGame-modal-title").on("click", function () {
        var i = $(this).index();
        $(this).addClass("swGame-curr").siblings().removeClass("swGame-curr");
        $("#loginDialog .swGame-modal-bd").eq(i).show().siblings().hide();
    });

    if($('#loginDialog').length>0){
        $('#btn_reg,#pageRegBtn').click(function () {
            $('#loginDialog').modal('show');
            $("#loginDialog .swGame-modal-title").eq(1).trigger("click");
        })
        $('#btn_login_sw,#pageLoginBtn').click(function () {
            $('#loginDialog').modal('show');
            $("#loginDialog .swGame-modal-title").eq(0).trigger("click");
        })
    }
    else{
        $('#btn_reg').click(function () {
            $("#btn_reg").attr("href","http://passport.kedou.com/front/noLogin/goRegist2_front.htm?memberType=1&amp;amp;returnCode=emailOrMobile&amp;amp;site_id=game_web");
            $("#btn_reg").attr("target","_blank");
        })
    }

    $('#btn-login_qq').on('click', function() {
        $('#btn_login_sw').trigger('click');
    })

    // 微信登录弹窗
    $('#showWxModalBtn').on('click', function() {
        var iframeUrl = "https://sso.swjoy.com/front/sso/youxi_page_t1/weixinLogin?width=600&height=400&top=0&left=0";
        var modal = $('#loginWxModal');

        showOtherModal(modal, iframeUrl);
    })

    // QQ登录弹窗
    $('#showQqModalBtn').on('click', function() {
        var iframeUrl = "https://sso.swjoy.com/front/sso/youxi_page_t1/qqLogin?width=600&height=460&top=0&left=0";
        var modal = $('#loginQqModal');

        showOtherModal(modal, iframeUrl);
    })

    // 微博登录弹窗
    $('#showWbModalBtn').on('click', function() {
        var iframeUrl = "https://sso.swjoy.com/front/sso/youxi_page_t1/weiboLogin?width=600&height=460&top=0&left=0";
        var modal = $('#loginWbModal');

        showOtherModal(modal, iframeUrl);
    })

    /****
     * 当弹出多个弹窗时，后面弹出的modal和遮罩层要将上一个盖住
     * 除头部以外的弹窗对用户可见时触发
     **/
    $(document).on('shown.bs.modal', '.modal', function (event) {
        var initZIndex = 1050;              //modal层的初始z-index
        var initMaskZIndex = 1040;          //遮罩层modal-backdrop的初始z-index
        var visibleLen = $('.modal:visible').length;        //已显示的modal层个数
        if(visibleLen > 1) {
            var zIndex = initZIndex + (10 * (visibleLen - 1));
            var zIndexMask = initMaskZIndex + 1 + (10 * (visibleLen - 1));
            $(this).css('z-index', zIndex);
            var mask = $('.modal-backdrop.in');
            var len = $('.modal.in').length;
            mask.eq(len-1).css('z-index', zIndexMask);
        } else {
            $('.modal.in').css('z-index', initZIndex);
            $('.modal-backdrop.in').css('z-index', initMaskZIndex);
        }
    });
})


// 弹出第三方登录弹窗
function showOtherModal(modal, iframeUrl) {
    if(!modal.find('iframe').attr('src') || modal.find('iframe').attr('src') == '') {
        modal.find('iframe').attr('src', iframeUrl);
    }
    modal.modal('show');
}

