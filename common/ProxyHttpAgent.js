'use strict';

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function _possibleConstructorReturn(self, call) { if (!self) { throw new ReferenceError("this hasn't been initialised - super() hasn't been called"); } return call && (typeof call === "object" || typeof call === "function") ? call : self; }

function _inherits(subClass, superClass) { if (typeof superClass !== "function" && superClass !== null) { throw new TypeError("Super expression must either be null or a function, not " + typeof superClass); } subClass.prototype = Object.create(superClass && superClass.prototype, { constructor: { value: subClass, enumerable: false, writable: true, configurable: true } }); if (superClass) Object.setPrototypeOf ? Object.setPrototypeOf(subClass, superClass) : subClass.__proto__ = superClass; }

var AgentOrigin = require('agentkeepalive');

module.exports = function (_AgentOrigin) {
    _inherits(Agent, _AgentOrigin);

    function Agent() {
        _classCallCheck(this, Agent);

        return _possibleConstructorReturn(this, (Agent.__proto__ || Object.getPrototypeOf(Agent)).apply(this, arguments));
    }

    _createClass(Agent, [{
        key: 'getName',

        // Hacky
        value: function getName(option) {
            var name = AgentOrigin.prototype.getName.call(this, option);
            name += ':';
            if (option.customSocketId) {
                name += option.customSocketId;
            }
            return name;
        }
    }]);

    return Agent;
}(AgentOrigin);