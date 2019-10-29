const {ipcRenderer: ipc} = require('electron');

var API_URL = 'https://www.ningmoe.com/api/';

// 图片加载错误处理
function imgError() {
	var img=event.srcElement;
	img.src="data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";
	img.onerror=null;
}

var currentPage;

// 刷新按钮
function reloadPage() {
	var pageIndex = $('.main-content-wrap .content.active').index();
	switch(pageIndex) {
		case 0:
			window.scrollTo(0,0);
			recommendSlide();
			topVideo();
			todayAnime();
			break;
		case 1:
			window.scrollTo(0,0);
			momentList();
			break;
		case 2:
			window.scrollTo(0,0);
			animeSchedule();
			break;
		case 3:
			window.scrollTo(0,0);
			userInfoQuery();
			userLikedAnime();
			break;
		default:
			window.scrollTo(0,0);
			if (currentPage == 'animeDetail') {
				var currentBangumiId = localStorage.getItem('currentBangumiId');
				animeDetail(currentBangumiId);
			} else if (currentPage == 'searchResult') {
				var currentSearchKeyword = localStorage.getItem('currentSearchKeyword');
				searchResult(currentSearchKeyword);
			}
			break;
	}

}

// 顶部slide数据渲染
function recommendSlide() {
	$.ajax({
		url: API_URL + 'get_recommend',
		type: 'POST',
		dataType: 'json',
		success: function(data) {
			renderRecommendSlide(data);

			function renderRecommendSlide(data) {
				var template  = $('#tpl-top-slide').html();
				Mustache.parse(template);
				var _html = Mustache.render(template, data);
				$('.recommend-list').html(_html);
			}

			var mySwiper = new Swiper('.recommend-list', {
				autoplay: 4000,
				loop: true,
				onTransitionEnd: function(swiper,event){
					// 拖动后恢复自动轮播
					swiper.startAutoplay();
				}
			})
		}
	});
}

// 顶部video数据渲染
function topVideo() {
	$.ajax({
		url: API_URL + 'get_list',
		type: 'POST',
		dataType: 'json',
		data: {
			page: 1,
			limit: 6
		},
		success: function(data) {
			renderTopVideo(data);

			function renderTopVideo(data) {
				var template  = $('#tpl-top-video').html();
				Mustache.parse(template);
				var _html = Mustache.render(template, data);
				$('.recommend-video').html(_html);
			}
		}
	});
}

// 今日新番数据渲染
function todayAnime() {
	$.ajax({
		url: 'https://www.ningmoe.com/bangumi.json',
		type: 'GET',
		dataType: 'json',
		success: function(data) {
			var today = new Date().getDay();
			var data = {
				data: data[today]
			};
			for (var i = 0; i < data.data.length; i++) {
				if (data.data[i].titleTranslate['zh-Hans']) {
					if (data.data[i].titleTranslate['zh-Hans'].length > 1) {
						data.data[i].titleTranslate['zh-Hans'] = data.data[i].titleTranslate['zh-Hans'][1];
					} else if (data.data[i].titleTranslate['zh-Hans'].length > 2) {
						data.data[i].titleTranslate['zh-Hans'] = data.data[i].titleTranslate['zh-Hans'][2];
					}
				}
				data.data[i].begin = data.data[i].begin.substr(11, 5);
			}
			renderTodayAnime(data);

			function renderTodayAnime(data) {
				var template  = $('#tpl-today-anime').html();
				Mustache.parse(template);
				var _html = Mustache.render(template, data);
				$('.today-anime').html(_html);
			}
		}
	});
}

// 秒数转换为分：秒
function secondConvert(s){
	//计算分钟
	//算法：将秒数除以60，然后下舍入，既得到分钟数
	var h;
	h = Math.floor(s/60);
	//计算秒
	//算法：取得秒%60的余数，既得到秒数
	s = s%60;
	//将变量转换为字符串
	h += '';
	s += '';
	//如果只有一位数，前面增加一个0
	h = (h.length==1) ? '0' + h : h;
	s = (s.length==1) ? '0' + s : s;
	return h + ' : ' + s;
}

var momentCurrentList = [];
var videoProgressTimer;
// 最美瞬间数据渲染
function momentList(opt) {
	$.ajax({
		url: API_URL + 'get_list',
		type: 'POST',
		data: {
			current_list: opt == 'more' ? "[" + String(momentCurrentList) +"]" : "[]",
			token: localStorage.getItem('token'),
			limit: 10,
			page: 1
		},
		dataType: 'json',
		success: function(data) {
			for (var i = 0; i < data.data.length; i++) {
				data.data[i].video_time = secondConvert(data.data[i].video_time);
				momentCurrentList.push(data.data[i].id);
			}
			renderMomentList(data);

			function renderMomentList(data) {
				var template  = $('#tpl-moment-list').html();
				Mustache.parse(template);
				var _html = Mustache.render(template, data);
				if (opt == 'more') {
					$('.moment-list').append(_html);
					$('.moment-list-box .loading-tip').fadeOut(200);
				} else {
					momentCurrentList = [];
					$('.moment-list').html(_html);
				}
			}

			$(document).on('click', '.moment-list .moment-video-wrap, .recommend-video .link-wrapper', function(event) {
				event.preventDefault();
				var _self = $(this);
				var videoLink = _self.attr('data-link');
				var cover = _self.find('.post').attr('src');

				$('#videoDialog').modal('show');

				const dp = new DPlayer({
					container: document.getElementById('video'),
					volume: 1.0,
					mutex: true,
					video: {
						url: videoLink,
						pic: cover,
						type: 'hls'
					}
				});

				var totalTime;
				var curTime;
				var progressPercent = 0;

				videoProgressTimer = setInterval(function() {
					totalTime = dp.video.duration;
					curTime = dp.video.currentTime;
					progressPercent = curTime / totalTime;
					if (progressPercent) {
						ipc.send('video-play-progress', progressPercent);
					}
				}, 500)

				// 播放弹窗关闭时重置任务栏图标进度
				$('#videoDialog').on('hidden.bs.modal', function(event) {
					dp.pause();
				});
			});
		}
	});
}

// 搜索处理
function searchHandle() {
	var keyword = $('.nav-bar-wrap .search-input').val();
	if (keyword) {
		searchResult(keyword);
	} else {
		ipc.send('please-input-search-keyword');
	}
}

// 搜索结果数据渲染
function searchResult(keyword) {
	currentPage = 'searchResult';
	localStorage.setItem('currentSearchKeyword', keyword);
	$.ajax({
		url: API_URL + 'search',
		type: 'POST',
		dataType: 'json',
		data: {
			bangumi_type: "",
			keyword: keyword,
			limit: 99,
			page: 1,
			type: "anime"
		},
		success: function(data) {
			renderSearchResult(data);

			function renderSearchResult(data) {
				var template  = $('#tpl-search-result').html();
				Mustache.parse(template);
				var _html = Mustache.render(template, data);
				$('.search-result').html(_html);

				$('.anime-detail-box .anime-detail').html('');
				$('.anime-detail-box').hide();
				$('.content.recommend, .content.moment, .content.anime, .content.mine').removeClass('active');
				$('.search-result-box').show();
			}
		}
	});
}

// 时间戳转换为日期
function formatTime(number, format) {
	var formateArr = ['Y', 'M', 'D', 'h', 'm', 's'];
	var returnArr = [];

	var date = new Date(number * 1000);
	returnArr.push(date.getFullYear());
	returnArr.push(formatNumber(date.getMonth() + 1));
	returnArr.push(formatNumber(date.getDate()));

	returnArr.push(formatNumber(date.getHours()));
	returnArr.push(formatNumber(date.getMinutes()));
	returnArr.push(formatNumber(date.getSeconds()));

	for (var i in returnArr) {
		format = format.replace(formateArr[i], returnArr[i]);
	}
	return format;
}
// 数据转化  
function formatNumber(n) {
	n = n.toString()
	return n[1] ? n : '0' + n
}

// 番剧详情数据渲染
function animeDetail(bangumId) {
	localStorage.setItem('currentBangumiId', bangumId)
	currentPage = 'animeDetail';

	$.ajax({
		url: API_URL + 'get_bangumi',
		type: 'POST',
		dataType: 'json',
		data: {
			bangumi_id: bangumId
		},
		success: function(data) {
			renderAnimeDetail(data);

			function renderAnimeDetail(data) {
				var template  = $('#tpl-anime-detail').html();
				Mustache.parse(template);
				var _html = Mustache.render(template, data);
				$('.anime-detail').html(_html);
				// 查找是否是喜欢
				$('.anime-detail .heart').each(function(index, el) {
					var _self = $(this);
					var bangumId = _self.attr('data-bangumi');
					if(likeAnime.indexOf(bangumId) != -1) {
						_self.addClass('liked');
					}
				});

				animeDetailComment();
				// 番剧评论数据渲染
				function animeDetailComment() {
					$.ajax({
						url: API_URL + 'get_comment_list',
						type: 'POST',
						data: {
							comment_id: 0,
							comment_type: 2,
							eps: 0,
							limit: 99,
							page: 1,
							video_id: bangumId
						},
						dataType: 'json',
						success: function(data) {
							var data = data;
							for (var i = 0; i < data.data.rows.length; i++) {
								data.data.rows[i].create_date = formatTime(data.data.rows[i].create_date, 'Y-M-D h:m:s');
							}
							renderAnimeDetailComment(data);

							function renderAnimeDetailComment(data) {
								var template  = $('#tpl-anime-detail-comment').html();
								Mustache.parse(template);
								var _html = Mustache.render(template, data);
								$('.anime-detail .comment-list-box .comment-list').html(_html);
							}
						}
					});
				}
			}

			$('.anime-detail .play-list').click(function(event) {
				var _self = $(this);
				var videoLink;
				if (_self.attr('data-link') != '') {
					videoLink = _self.attr('data-link');
					loadAnime(videoLink);
				} else {
					var backLink = _self.attr('data-back-link');
					
					loadRealBackUrl(backLink);
				}

				function loadRealBackUrl(backLink) {
					$.ajax({
						url: API_URL + 'get_real_yun_url',
						type: 'POST',
						data: {
							url: backLink
						},
						dataType: 'json',
						success: function(data) {
							videoLink = data.data.yun_url;
							$('#videoDialog').modal('show');

							const dp = new DPlayer({
								container: document.getElementById('video'),
								volume: 1.0,
								mutex: true,
								video: {
									url: videoLink,
									type: 'auto'
								}
							});

							dp.on('error', function(event) {
								ipc.send('error-anime-play');
								return;
							});

							var totalTime;
							var curTime;
							var progressPercent = 0;

							videoProgressTimer = setInterval(function() {
								totalTime = dp.video.duration;
								curTime = dp.video.currentTime;
								progressPercent = curTime / totalTime;
								if (progressPercent) {
									ipc.send('video-play-progress', progressPercent);
								}
							}, 500)

							// 播放弹窗关闭时重置任务栏图标进度
							$('#videoDialog').on('hidden.bs.modal', function(event) {
								dp.pause();
							});
						}
					});
				}
				
				function loadAnime(videoLink) {
					$('#videoDialog').modal('show');

					const dp = new DPlayer({
						container: document.getElementById('video'),
						volume: 1.0,
						mutex: true,
						video: {
							url: videoLink,
							type: 'auto'
						}
					});

					dp.on('error', function(event) {
						var backLink = _self.attr('data-back-link');
						if (backLink) {
							loadRealBackUrl(backLink);
						} else {
							ipc.send('error-anime-play');
						}
						return;
					});

					var totalTime;
					var curTime;
					var progressPercent = 0;

					videoProgressTimer = setInterval(function() {
						totalTime = dp.video.duration;
						curTime = dp.video.currentTime;
						progressPercent = curTime / totalTime;
						if (progressPercent) {
							ipc.send('video-play-progress', progressPercent);
						}
					}, 500)

					// 播放弹窗关闭时重置任务栏图标进度
					$('#videoDialog').on('hidden.bs.modal', function(event) {
						dp.pause();
					});
				}

			});
		}
	});
}

// 新番时间表数据渲染
function animeSchedule() {
	$.ajax({
		url: 'https://www.ningmoe.com/bangumi.json',
		type: 'GET',
		dataType: 'json',
		success: function(data) {
			for (var i = 0; i < data.length; i++) {
				for (var j = 0; j < data[i].length; j++) {
					if (data[i][j].titleTranslate['zh-Hans']) {
						if (data[i][j].titleTranslate['zh-Hans'].length > 1) {
							data[i][j].titleTranslate['zh-Hans'] = data[i][j].titleTranslate['zh-Hans'][1];
						} else if (data[i][j].titleTranslate['zh-Hans'].length > 2) {
							data[i][j].titleTranslate['zh-Hans'] = data[i][j].titleTranslate['zh-Hans'][2];
						}
					}
					
					data[i][j].begin = data[i][j].begin.substr(11, 5);
					switch(i) {
						case 1:
							data[i][j].begin = '每周一 ' + data[i][j].begin;
							break;
						case 2:
							data[i][j].begin = '每周二 ' + data[i][j].begin;
							break;
						case 3:
							data[i][j].begin = '每周三 ' + data[i][j].begin;
							break;
						case 4:
							data[i][j].begin = '每周四 ' + data[i][j].begin;
							break;
						case 5:
							data[i][j].begin = '每周五 ' + data[i][j].begin;
							break;
						case 6:
							data[i][j].begin = '每周六 ' + data[i][j].begin;
							break;
						case 0:
							data[i][j].begin = '每周日 ' + data[i][j].begin;
							break;
						default:
							break;
					}
					
				}
			}

			var data = {
				Mon: data[1],
				Tues: data[2],
				Wed: data[3],
				Thur: data[4],
				Fri: data[5],
				Sat: data[6],
				Sun: data[0]
			};

			renderAnimeSchedule(data);
			// 选择默认星期番剧
			selectTodayAnime();

			function renderAnimeSchedule(data) {
				var template  = $('#tpl-anime-schedule').html();
				Mustache.parse(template);
				var _html = Mustache.render(template, data);
				$('.anime-schedule').html(_html);
			}
		}
	});
}

// 根据星期默认激活番剧选择按钮
function selectTodayAnime() {
	var today = new Date().getDay();
	if (today == 0) {
		today = 7;
	}
	var defaultIndex = today - 1;
	$('.anime-schedule-box .week-select').eq(defaultIndex).click();
	$('.anime-schedule-box .anime-schedule .week-anime').eq(defaultIndex).addClass('active');
}

// 登录注册
var phoneReg = /(^1[3|4|5|7|8]\d{9}$)|(^09\d{8}$)/; // 手机号正则
var count = 59; // 间隔函数，1秒执行
var intervalObj; // timer变量，控制时间
var curCount; // 当前剩余秒数

// 验证码
function sendMessage() {
	curCount = count;
	var phone = $.trim($('.tel').val());
	if (!phoneReg.test(phone)) {
		$(".tel").val('请输入有效的手机号码');
		return false;
	}

	// 设置button效果，开始计时
	var elemt = $(".get-code");
	elemt.removeAttr("onclick");
	disabled(elemt);
	$(".get-code").addClass('hui');
	$(".get-code").removeClass('btn-opt');
	$(".get-code").text( + curCount + "秒后重发");
	intervalObj = window.setInterval(setRemainTime, 1000); // 启动计时器，1秒执行一次

	// 向后台发送处理数据
	$.ajax({
		url: API_URL + 'get_sms',
		type: 'POST',
		dataType: 'json',
		data: {
			phone: phone
		},
		success: function(data) {

		}
	});

}

// 禁止点击事件
function disabled(ele) {
	$(ele).addClass('disabled').on('click', function (e) {
		e.preventDefault();
		e.stopPropagation();
		return false;
	});
}

function setRemainTime() {
	if (curCount == 0) {                
		window.clearInterval(intervalObj);// 停止计时器
		$(".get-code").addClass('btn-opt');
		$(".get-code").attr('onclick', 'sendMessage()');
		$(".get-code").removeClass('disabled hui');// 启用按钮
		$(".get-code").text("重新发送");
	}
	else {
		curCount--;
		$(".get-code").text( + curCount + "秒后重发");
	}
}

var token;
var uuid;

// 登录注册按钮提交
function submit(){
	var phone = $.trim($('.tel').val());
	var code = $.trim($('.code').val());
	// 登录
	$.ajax({
		url: API_URL + 'reg',
		type: 'POST',
		dataType: 'json',
		data: {
			phone_number: phone,
			sms_code: code
		},
		success: function(data) {
			if (data.success == true) {
				isLoginFlag = true;
				token = data.data.token;
				uuid = data.data.uuid;

				localStorage.setItem('token', token);
				localStorage.setItem('uuid', uuid);

				// 续期token
				$.ajax({
					url: API_URL + 'verify_token',
					type: 'POST',
					dataType: 'json',
					data: {
						token: token
					},
					success: function(data) {
						token = data.data.token;
						uuid = data.data.uuid;

						localStorage.setItem('token', token);
						localStorage.setItem('uuid', uuid);

						// 查询用户信息
						$.ajax({
							url: API_URL + 'get_user_profile',
							type: 'POST',
							dataType: 'json',
							data: {
								token: token,
								uuid: uuid
							},
							success: function(data) {
								var userInfo = data.data;
								
								$('#loginDialog').modal('hide');
								$('.side-bar-wrap .info-center-box .not-login').hide();
								$('.side-bar-wrap .info-center-box .already-login').show();
								if (!userInfo.avatar) {
									userInfo.avatar = './images/noavatar_big.gif'
								}
								$('.side-bar-wrap .info-center-box .already-login .avatar').attr('src', userInfo.avatar);
								$('.side-bar-wrap .info-center-box .already-login .username').text(userInfo.username);

								userInfoQuery();
							}
						});
					}
				});
			} else {
				ipc.send('login-failed', data.message);
			}
		}
	});
}

// 检查最近是否登录过
var isLoginFlag = false;
function isRecentLogin() {
	$.ajax({
		url: API_URL + 'is_login',
		type: 'POST',
		dataType: 'json',
		data: {
			token: localStorage.getItem('token')
		},
		success: function(data) {
			if (data.success == true) {
				isLoginFlag = true;

				// 查询用户信息
				$.ajax({
					url: API_URL + 'get_user_profile',
					type: 'POST',
					dataType: 'json',
					data: {
						token: localStorage.getItem('token'),
						uuid: localStorage.getItem('uuid')
					},
					success: function(data) {
						var userInfo = data.data;
						
						$('#loginDialog').modal('hide');
						$('.side-bar-wrap .info-center-box .not-login').hide();
						$('.side-bar-wrap .info-center-box .already-login').show();
						if (!userInfo.avatar) {
							userInfo.avatar = './images/noavatar_big.gif'
						}
						$('.side-bar-wrap .info-center-box .already-login .avatar').attr('src', userInfo.avatar);
						$('.side-bar-wrap .info-center-box .already-login .username').text(userInfo.username);
					}
				});
			} else {
				isLoginFlag = false;
				$('.side-bar-wrap .info-center-box .not-login').show();
				$('.mine .not-login').show();
			}
		}
	});
}

// 发送评论
function sendComment(comment, bangumId) {
	$.ajax({
		url: API_URL + 'send_comment',
		type: 'POST',
		data: {
			comment_id: 0,
			comment_type: 2,
			eps: 0,
			content: comment,
			video_id: bangumId,
			token: localStorage.getItem('token')
		},
		dataType: 'json',
		success: function(data) {
			animeDetail(bangumId);
		}
	});
}

// 个人中心查询用户信息
function userInfoQuery() {
	if (isLoginFlag) {
		// 查询用户信息
		$.ajax({
			url: API_URL + 'get_user_profile',
			type: 'POST',
			dataType: 'json',
			data: {
				token: localStorage.getItem('token'),
				uuid: localStorage.getItem('uuid')
			},
			success: function(data) {
				var userInfo = data.data;
				
				$('#loginDialog').modal('hide');
				$('.mine .not-login').hide();
				$('.mine .already-login').show();
				if (!userInfo.avatar) {
					userInfo.avatar = './images/noavatar_big.gif'
				}
				$('.mine .already-login .avatar').attr('src', userInfo.avatar);
				$('.mine .already-login .username').text(userInfo.username);
				var sexText = userInfo.sex ? '性别：男' : '性别：女';
				$('.mine .already-login .sex').text(sexText);
				$('.mine .already-login .birthday').text('生日：' + userInfo.birthday);
				$('.mine .already-login .create-date').text('创建日：' + formatTime(userInfo.createDate, 'Y-M-D h:m:s'));
				$('.mine .already-login .fans-count').text('粉丝数：' + userInfo.fans_count);
				$('.mine .already-login .follow-count').text('关注数：' + userInfo.follow_count);
			}
		});
	} else {
		$('.mine .not-login').show();
	}
}

// 给数组添加移除方法
Array.prototype.indexOf = function(val) {
	for (var i = 0; i < this.length; i++) {
		if (this[i] == val) return i;
	}
	return -1;
};
Array.prototype.remove = function(val) {
	var index = this.indexOf(val);
	if (index > -1) {
		this.splice(index, 1);
	}
};

// 个人最爱番剧列表
var stringLikeAnime = [];
if (localStorage.getItem('likeAnime')) {
	stringLikeAnime = localStorage.getItem('likeAnime').split(',');
	stringLikeAnime.remove('0');
	for (var i = 0; i < stringLikeAnime.length; i++) {
		stringLikeAnime[i] = Number(stringLikeAnime[i]);
	}
}
var likeAnime = stringLikeAnime;

// 个人最爱番剧数据渲染
function userLikedAnime(bangumId) {
	$('.user-info-box .anime-box').html('');
	likeAnime.remove('0');
	likeAnime = likeAnime.sort(function(a, b){return b - a});
	if (likeAnime.length > 0) {
		$('.user-info-box .no-liked').hide();

		function renderLikedAnime(data) {
			var template  = $('#tpl-liked-anime').html();
			Mustache.parse(template);
			var _html = Mustache.render(template, data);
			$('.user-info-box .anime-box').html(_html);
		}

		var resultData = {
			data: []
		}
		for (var i = 0; i < likeAnime.length; i++) {
			$.ajax({
				url: API_URL + 'get_bangumi',
				type: 'POST',
				dataType: 'json',
				data: {
					bangumi_id: likeAnime[i]
				},
				success: function(data) {
					resultData.data.push(data.data);
					resultData.data.sort(function(a, b){return b.bangumi.bgm_id - a.bangumi.bgm_id});

					renderLikedAnime(resultData);
				}
			});
		}
	} else {
		$('.user-info-box .no-liked').show();
	}
}

!(function($) {

	// 检查最近是否登录
	isRecentLogin();
	// 登录弹窗回车处理
	$('#loginDialog .code').bind('keypress', function(event) {
		if (event.keyCode == '13') {
			$('#loginDialog .code').blur();
			submit();
		}
	});
	// 点击头像进入我的
	$(document).on('click', '.side-bar-wrap .avatar', function(event) {
		event.preventDefault();
		$('.side-bar-wrap .menu-list .mine').click();
	});
	// 点击进入我的
	$(document).on('click', '.side-bar-wrap .menu-list .mine', function(event) {
		event.preventDefault();
		// 渲染我的页数据
		userInfoQuery();
		userLikedAnime();
		$('.user-info-box').show();
	});

	// 渲染推荐页数据
	recommendSlide();
	topVideo();
	todayAnime();

	// 渲染瞬间页数据
	momentList();

	// 渲染番剧页数据
	animeSchedule();

	// 搜索回车处理
	$('.nav-bar-wrap .search-input').bind('keypress', function(event) {
		if (event.keyCode == '13') {
			$('.nav-bar-wrap .search-input').blur();
			searchHandle();
		}
	});
	// 搜索时渲染结果
	$(document).on('click', '.nav-bar-wrap .search-btn', function(event) {
		event.preventDefault();
		searchHandle();
	});

	// sidebar菜单点击切换
	$(document).on('click', '.menu-box li', function() {
		$('.anime-detail-box  .anime-detail').html('');
		$('.anime-detail-box').hide();
		$('.search-result-box').hide();
		$(this).addClass('active').siblings().removeClass('active');
		var idx = $(this).index();
		$('.main-content-wrap .content').eq(idx).addClass('active').siblings().removeClass('active');
	});

	// 查看更多最美瞬间
	$(document).on('click', '.recommend-video-box .moment', function(event) {
		event.preventDefault();
		$('.menu-box .moment').click();
	});

	// 加载更多瞬间
	$(window).scroll(function() {
		var scrollTop = $(this).scrollTop();
		var scrollHeight = $(document).height();
		var windowHeight = $(this).height();
		if (scrollTop + windowHeight == scrollHeight) {
			$('.moment-list-box .loading-tip').fadeIn(200);
			momentList('more');
		}
	});

	// 推荐页查看番剧详情
	$(document).on('click', '.recommend-list .link-wrapper, .today-anime .link-wrapper', function(event) {
		event.preventDefault();
		var _self = $(this);
		$('.content.recommend').removeClass('active');
		$('.anime-detail-box').show();
		var bangumId = _self.attr('data-bangumi');
		animeDetail(bangumId);
	});

	// 番剧页查看番剧详情
	$(document).on('click', '.anime-schedule-box .link-wrapper', function(event) {
		event.preventDefault();
		var _self = $(this);
		$('.content.anime').removeClass('active');
		$('.anime-detail-box').show();
		var bangumId = _self.attr('data-bangumi');
		animeDetail(bangumId);
	});

	// 搜索结果页查看番剧详情
	$(document).on('click', '.search-result-box .bangumi-wrapper', function(event) {
		event.preventDefault();
		var _self = $(this);
		$('.search-result-box').hide();
		$('.anime-detail-box').show();
		var bangumId = _self.attr('data-bangumi');
		animeDetail(bangumId);
	});

	// 我的页查看番剧详情
	$(document).on('click', '.mine .anime-box .video-item .link-wrapper', function(event) {
		event.preventDefault();
		var _self = $(this);
		$('.user-info-box').hide();
		$('.anime-detail-box').show();
		var bangumId = _self.attr('data-bangumi');
		animeDetail(bangumId);
	});

	// 番剧详情页点击评论按钮
	$(document).on('click', '.anime-detail-box .comment-box .comment-btn', function(event) {
		event.preventDefault();
		var _self = $(this);
		var commentText = _self.siblings('.comment-input').val();
		if (_self.hasClass('active')) {
			if (commentText) {
				if (isLoginFlag == true) {
					var currentBangumiId = localStorage.getItem('currentBangumiId');
					sendComment(commentText, currentBangumiId);
					_self.siblings('.comment-input').val('');
				} else {
					ipc.send('please-login-first');
				}
			} else {
				_self.removeClass('active');
				_self.siblings('.comment-input').removeClass('active');
			}
		} else {
			_self.addClass('active');
			_self.siblings('.comment-input').addClass('active');
		}
	});
	// 番剧详情页点击最爱
	$(document).on('click', '.anime-detail-box .text-box .heart', function(event) {
		var _self = $(this);
		if (_self.hasClass('liked')) {
			_self.removeClass('liked');
			ipc.send('unlike-anime');
			var bangumId = _self.attr('data-bangumi');
			likeAnime.remove(bangumId);
			localStorage.setItem('likeAnime', likeAnime);
		} else {
			_self.addClass('liked');
			ipc.send('like-anime');
			var bangumId = _self.attr('data-bangumi');
			likeAnime.push(bangumId);
			localStorage.setItem('likeAnime', likeAnime);
		}
	});

	// 查看番剧时间表
	$('.today-anime-box').on('click', '.schedule', function(event) {
		event.preventDefault();
		$('.menu-box .anime').click();
	});
	// 番剧时间切换
	$(document).on('click', '.anime-schedule-box .week-select', function() {
		$(this).addClass('active').siblings().removeClass('active');
		var idx = $(this).index();
		$('.anime-schedule-box .anime-schedule .week-anime').eq(idx).addClass('active').siblings().removeClass('active');
	});

	// 播放弹窗关闭时重置任务栏图标进度
	$('#videoDialog').on('hidden.bs.modal', function(event) {
		clearInterval(videoProgressTimer);
		ipc.send('video-play-progress', 0);
	});

	// 最小化和关闭
	$('.btn-box .min-btn').on('click', function(event) {
		event.preventDefault();
		ipc.send('min');
	});
	$('.btn-box .close-btn').on('click', function(event) {
		event.preventDefault();
		ipc.send('close');
	});
}(jQuery));

