// HalfTime, FirstHalf, SecondHalf
import $ from 'jquery';
import Vue from 'vue/dist/vue.min';

var SERVICES = 'https://s3-us-west-2.amazonaws.com/dimayor-opta-feeds/',
    OPTA_IMAGES = 'http://omo.akamai.opta.net/image.php?h=omo.akamai.opta.net&sport=football&entity=team&description=badges&dimensions=__SIZE__&id=__ID__';

var Dimayor = (function(my){
  "use strict";

  my.start = function(){
    $(function(){
      my.VM.start();
      my.Opta.start();
      configTabs();
      configPlayerProfile();
    });
  };
  
  function configTabs(){
    $('.tabs').on('click', 'a', function(e){
      var t = $(this.getAttribute('href'));
      setTimeout(function(){
        Dimayor.Opta.startWidget(t);
      });
    });
  }
  
  function configPlayerProfile(){
    var comp = Util.param('competition'),
			season = Util.param('season'),
			round = Util.param('round');

    $('#matchstats-lineups').on('click', '.Opta-Player', function(){
      var team, player;
      this.parentNode.classList.forEach(function(v,i){
        if(v.indexOf('Opta-Team-') === 0){
          team = v.replace('Opta-Team-', '');
        }
      });
      
      this.classList.forEach(function(v,i){
        if(v.indexOf('Opta-Player-') === 0){
          player = v.replace('Opta-Player-', '');
        }
      });
      
      var html = '<opta-widget sport="football" widget="player_profile" competition="' + comp + '" season="' + season + '" team="' + team + '" player="' + player + '" template="normal" show_images="true" show_country="true" show_flags="true" date_format="D MMMM YYYY" height_units="m" weight_units="kg" player_naming="full" show_logo="false" show_title="true" breakpoints="400"></opta-widget>';
      $('#modal-player .modal-content').html(html);
      
      $('#modal-player').removeClass('hide');
      setTimeout(function(){
        $('#modal-player').addClass('show');
        Opta.start();
      }, 50);
      
    });
    
    $('#modal-player BUTTON.close').on('click', function(){
      $('#modal-player').removeClass('show');
      setTimeout(function(){
        $('#modal-player').addClass('hide');
        $('#modal-player .modal-content').html('');
      }, 500);
    });
  }
  
  return my;

})(Dimayor||{});

Dimayor.VM = (function(){
  "use strict";
  var my = {}, _vmRound = {}, _round={}, _competition;

  my.start = function(){
    createComponents();
    createVM();

    my.loadRound(function(){
      setTimeout(function(){
        new Foundation.Accordion($('#round-accordion'));
      }, 1000);
    });

    my.loadCompetition(function(){
      $('#round .fecha').html(_competition);
    });
    
    setInterval(my.loadRound, 30000);
  };
  
	my.loadRound = function(fn){
    var comp = Util.param('competition'),
			season = Util.param('season'),
			round = Util.param('round');

//    Util.getFeed('summary/' + comp + '/' + season + '/all.json', function(j){
    Util.getFeed('schedules/' + comp + '/' + season + '/rounds/' + round + '.json', function(j){
      try{
        _vmRound.$data.round = getMatches(j.matches);
//        _competition = j.competition.name;
        fn&&fn();
      } catch (e){
        console.log(e);
      }
		});
	};
  
	my.loadCompetition = function(fn){
    var comp = Util.param('competition'),
			season = Util.param('season');

    Util.getFeed('summary/' + comp + '/' + season + '/all.json', function(j){
      try{
        _competition = j.competition.name + ' - ' + season;
        fn&&fn();
      } catch (e){
        console.log(e);
      }
		});
	};
  
  //Private
  function createVM(){

    window._vmRound = _vmRound = new Vue({
			el: '#round',
			data: {
				round: {},
			}
		});

  }
  
  function createComponents(){

    var data = { 
      comp: Util.param('competition'),
      season: Util.param('season'),
      round: Util.param('round'),
      opta_images: OPTA_IMAGES,
    };

    Vue.component('menu-match', {
			props: ['match'],
      data : function(){
        return data;
      },
			template: '\
<a class="row gamecast-nav" :class="match.period" :href="\'?&competition=\'+comp+\'&season=\'+season+\'&round=\'+round+\'&match=\'+match.id">\
	<div class="small-5 text-right">{{match.home.name.substring(0,3)}}<img :src="opta_images.replace(\'__ID__\', match.home.id).replace(\'__SIZE__\', 20)" alt="" class="escudo"></div>\
	<div class="small-2 text-center marcador">{{ match.home.score }} - {{ match.away.score }}</div>\
	<div class="small-5 text-left"><img :src="opta_images.replace(\'__ID__\', match.away.id).replace(\'__SIZE__\', 20)" alt="" class="escudo">{{match.away.name.substring(0,3)}}</div>\
</a>'
		});

		Vue.component('menu-round', {
			props: ['date'],
			template: '\
<li class="accordion-item" :class="date.id ? \'\' : \'is-active\'" data-accordion-item>\
	<a href="#" class="accordion-title">{{date.date}}</a>\
	<div class="accordion-content" data-tab-content><menu-match v-for="item in date.matches" :match="item" :key="item.id"></menu-match></div></li>'
		});

	}
  
  function getMatches(j){
    var matches = {}, date, dates = [];

    $.each(j, function(){
      date = this.date.split(' ')[0];
      if(!matches[date]){
        matches[date] = [];
        dates.push(date);
      }
      matches[date].push(this);
    });

    dates.sort(function(a, b){
      if(a<b){
        return -1;
      }
      else{
        return 1;
      }
    });

    var round = [];
    dates.forEach(function(v,i){
      round.push({
        id: i,
        date: Util.dateFormat(new Date(v + 'T00:00:00-05:00')),
        matches: matches[v]
      });
    });
    
    return round;
  }

  return my;

})();


Dimayor.Opta = (function(){
  "use strict";
  
  var my = {}, _live = false;
  
  my.start = function(){
    configWidgets(function(){

      my.startWidget($('#opta-w-timeline'));
      my.startWidget($('#juego'));

    });
  };

  //Private
  function configWidgets(fn){
    configureMatchWidget(function(live){
      var comp = Util.param('competition'),
          season = Util.param('season'),
          match = Util.param('match'),
          live = live ? 'true' : 'false';

      $('opta-widget').each(function(){
        this.setAttribute('competition', comp);
        this.setAttribute('match', match);
        this.setAttribute('season', season);
        this.setAttribute('breakpoints', '400, 767, 991, 1170');
        this.setAttribute('live', live);
      });
      
      fn&&fn();

    });
  };

  my.startWidget = function($parent){
    if($parent.data('children')){
      var ref = '[parent="' + $parent.data('children') + '"]';
    } else {
      ref = '';
    }
    
    $parent.find('opta-widget' + ref).each(function(){
      this.removeAttribute('load');
    });

    Opta.start();
  }

  function configureMatchWidget(fn){
    var comp = Util.param('competition'),
			season = Util.param('season'),
			match = Util.param('match');
    
    Util.getFeed('schedules/' + comp + '/' + season + '/matches/' + match + '.json', function(j){
      var $w = $('opta-widget.season-team-stats');
      
      $w[0].setAttribute('team', j.home.id);
      $w[1].setAttribute('team', j.away.id);
      
      $('.logo-team-home').each(function(){
        this.src = OPTA_IMAGES.replace('__ID__', j.home.id).replace('__SIZE__', '65');
      });
      
      $('.logo-team-away').each(function(){
        this.src = OPTA_IMAGES.replace('__ID__', j.away.id).replace('__SIZE__', '65');
      });
      
      fn&&fn(j.period != 'PreMatch' && j.period != 'FullTime');
		});
  }
  
  return my;

})(Dimayor||{});


var Util = (function(){
  "use strict";

  var my = {}, urlParams = {},
  dateFormats = {
    "AMPMS": [
      "a. m.",
      "p. m."
    ],
    "DAY": [
      "domingo",
      "lunes",
      "martes",
      "mi\u00e9rcoles",
      "jueves",
      "viernes",
      "s\u00e1bado"
    ],
    "ERANAMES": [
      "antes de Cristo",
      "despu\u00e9s de Cristo"
    ],
    "ERAS": [
      "a. C.",
      "d. C."
    ],
    "FIRSTDAYOFWEEK": 0,
    "MONTH": [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre"
    ],
    "SHORTDAY": [
      "dom.",
      "lun.",
      "mar.",
      "mi\u00e9.",
      "jue.",
      "vie.",
      "s\u00e1b."
    ],
    "SHORTMONTH": [
      "ene.",
      "feb.",
      "mar.",
      "abr.",
      "may.",
      "jun.",
      "jul.",
      "ago.",
      "sept.",
      "oct.",
      "nov.",
      "dic."
    ],
    "STANDALONEMONTH": [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre"
    ],
    "WEEKENDRANGE": [
      5,
      6
    ],
    "fullDate": "EEEE, d 'de' MMMM 'de' y",
    "longDate": "d 'de' MMMM 'de' y",
    "medium": "d MMM y H:mm:ss",
    "mediumDate": "d MMM y",
    "mediumTime": "H:mm:ss",
    "short": "d/M/yy H:mm",
    "shortDate": "d/M/yy",
    "shortTime": "H:mm"
  };

  my.param = function(name, def){
    return urlParams[name] || (def||'');
  }

  my.getFeed = function(feed, fn){
    $.ajax({
      url: SERVICES + feed,
      dataType: 'json',
      cache: false,
    }).done(function(j){
      fn(j);
    });
  }
  
  my.dateFormat = function(date){
    return dateFormats["DAY"][date.getDay()] + ' ' +
      date.getDate() + ' de ' +
      dateFormats["MONTH"][date.getMonth()];
  }
  
  // Private
  function loadParameters(){
    var match,
      pl     = /\+/g,  // Regex for replacing addition symbol with a space
      search = /([^&=]+)=?([^&]*)/g,
      decode = function (s) { return decodeURIComponent(s.replace(pl, " ")); },
      query  = window.location.search.substring(1);

    while (match = search.exec(query))
       urlParams[decode(match[1])] = decode(match[2]);
  }

  loadParameters();

  return my;
}());


window.opta_settings = {
  subscription_id: 'e6804b56ef36694d562814192de3e53b',
  language:      'es_CO',
  timezone: 'America/Bogota'
};


module.exports = Dimayor;

window.dimayor = Dimayor;