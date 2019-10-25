import React, { Component } from 'react';
// import { ViewPropTypes } from 'react-native';
import { Animated, Easing, Platform, ScrollView, View, International, VirtualListView } from 'reactxp';
import PropTypes from 'prop-types';
import shallowCompare from 'react-addons-shallow-compare';
import {
    defaultScrollInterpolator,
    stackScrollInterpolator,
    tinderScrollInterpolator,
    defaultAnimatedStyles,
    shiftAnimatedStyles,
    stackAnimatedStyles,
    tinderAnimatedStyles
} from '../utils/animations';
   
const IS_IOS = Platform.OS === 'ios';

// Native driver for scroll events
// See: https://facebook.github.io/react-native/blog/2017/02/14/using-native-driver-for-animated.html
const AnimatedListView = VirtualListView ? Animated.View : null;
const AnimatedScrollView = Animated.View;

// React Native automatically handles RTL layouts; unfortunately, it's buggy with horizontal ScrollView
// See https://github.com/facebook/react-native/issues/11960
// NOTE: the following variable is not declared in the constructor
// otherwise it is undefined at init, which messes with custom indexes
const IS_RTL = International.isRTL;

export default class Carousel extends Component {

    static propTypes = {
        data: PropTypes.array.isRequired,
        renderItem: PropTypes.func.isRequired,
        itemWidth: PropTypes.number, // required for horizontal carousel
        itemHeight: PropTypes.number, // required for vertical carousel
        sliderWidth: PropTypes.number, // required for horizontal carousel
        sliderHeight: PropTypes.number, // required for vertical carousel
        activeAnimationType: PropTypes.string,
        activeAnimationOptions: PropTypes.object,
        activeSlideAlignment: PropTypes.oneOf(['center', 'end', 'start']),
        activeSlideOffset: PropTypes.number,
        apparitionDelay: PropTypes.number,
        autoplay: PropTypes.bool,
        autoplayDelay: PropTypes.number,
        autoplayInterval: PropTypes.number,
        callbackOffsetMargin: PropTypes.number,
      //  containerCustomStyle: ViewPropTypes ? ViewPropTypes.style : View.propTypes.style,
      //  contentContainerCustomStyle: ViewPropTypes ? ViewPropTypes.style : View.propTypes.style,
        enableMomentum: PropTypes.bool,
        enableSnap: PropTypes.bool,
        firstItem: PropTypes.number,
        hasParallaxImages: PropTypes.bool,
        inactiveSlideOpacity: PropTypes.number,
        inactiveSlideScale: PropTypes.number,
        inactiveSlideShift: PropTypes.number,
        layout: PropTypes.oneOf(['default', 'stack', 'tinder']),
        layoutCardOffset: PropTypes.number,
        lockScrollTimeoutDuration: PropTypes.number,
        lockScrollWhileSnapping: PropTypes.bool,
        loop: PropTypes.bool,
        loopClonesPerSide: PropTypes.number,
        scrollEnabled: PropTypes.bool,
        scrollInterpolator: PropTypes.func,
        slideInterpolatedStyle: PropTypes.func,
      //  slideStyle: ViewPropTypes ? ViewPropTypes.style : View.propTypes.style,
        shouldOptimizeUpdates: PropTypes.bool,
        swipeThreshold: PropTypes.number,
        useScrollView: PropTypes.oneOfType([PropTypes.bool, PropTypes.func]),
        vertical: PropTypes.bool,
        onBeforeSnapToItem: PropTypes.func,
        onSnapToItem: PropTypes.func
    };

    static defaultProps = {
        activeAnimationType: 'timing',
        activeAnimationOptions: null,
        activeSlideAlignment: 'center',
        activeSlideOffset: 20,
        apparitionDelay: 0,
        autoplay: false,
        autoplayDelay: 1000,
        autoplayInterval: 3000,
        callbackOffsetMargin: 5,
        containerCustomStyle: {},
        contentContainerCustomStyle: {},
        enableMomentum: false,
        enableSnap: true,
        firstItem: 0,
        hasParallaxImages: false,
        inactiveSlideOpacity: 0.7,
        inactiveSlideScale: 0.9,
        inactiveSlideShift: 0,
        layout: 'default',
        lockScrollTimeoutDuration: 1000,
        lockScrollWhileSnapping: false,
        loop: false,
        loopClonesPerSide: 3,
        scrollEnabled: true,
        slideStyle: {},
        shouldOptimizeUpdates: true,
        swipeThreshold: 20,
        useScrollView: true,
        vertical: false
    }

    constructor (props) {
        super(props);

        this.state = {
            hideCarousel: true,
            interpolators: []
        };
    }

    _needsScrollView () {
        const { useScrollView } = this.props;
        return useScrollView || !AnimatedFlatList || this._shouldUseStackLayout() || this._shouldUseTinderLayout();
    }

    _needsRTLAdaptations () {
        const { vertical } = this.props;
        return IS_RTL && !IS_IOS && !vertical;
    }

    _enableLoop () {
        const { data, enableSnap, loop } = this.props;
        return enableSnap && loop && data && data.length && data.length > 1;
    }

    _shouldAnimateSlides (props = this.props) {
        const { inactiveSlideOpacity, inactiveSlideScale, scrollInterpolator, slideInterpolatedStyle } = props;
        return inactiveSlideOpacity < 1 ||
            inactiveSlideScale < 1 ||
            !!scrollInterpolator ||
            !!slideInterpolatedStyle ||
            this._shouldUseShiftLayout() ||
            this._shouldUseStackLayout() ||
            this._shouldUseTinderLayout();
    }

    _shouldUseCustomAnimation () {
        const { activeAnimationOptions } = this.props;
        return !!activeAnimationOptions && !this._shouldUseStackLayout() && !this._shouldUseTinderLayout();
    }

    _shouldUseShiftLayout () {
        const { inactiveSlideShift, layout } = this.props;
        return layout === 'default' && inactiveSlideShift !== 0;
    }

    _shouldUseStackLayout () {
        return this.props.layout === 'stack';
    }

    _shouldUseTinderLayout () {
        return this.props.layout === 'tinder';
    }

    _getKeyExtractor (item, index) {
        return this._needsScrollView() ? `scrollview-item-${index}` : `flatlist-item-${index}`;
    }

    _getContainerInnerMargin (opposite = false) {
        const { sliderWidth, sliderHeight, itemWidth, itemHeight, vertical, activeSlideAlignment } = this.props;

        if ((activeSlideAlignment === 'start' && !opposite) ||
            (activeSlideAlignment === 'end' && opposite)) {
            return 0;
        } else if ((activeSlideAlignment === 'end' && !opposite) ||
            (activeSlideAlignment === 'start' && opposite)) {
            return vertical ? sliderHeight - itemHeight : sliderWidth - itemWidth;
        } else {
            return vertical ? (sliderHeight - itemHeight) / 2 : (sliderWidth - itemWidth) / 2;
        }
    }

    _getComponentOverridableProps () {
        const {
            enableMomentum,
            itemWidth,
            itemHeight,
            loopClonesPerSide,
            sliderWidth,
            sliderHeight,
            vertical
        } = this.props;

        const visibleItems = Math.ceil(vertical ?
            sliderHeight / itemHeight :
            sliderWidth / itemWidth) + 1;
        const initialNumPerSide = this._enableLoop() ? loopClonesPerSide : 2;
        const initialNumToRender = visibleItems + (initialNumPerSide * 2);
        const maxToRenderPerBatch = 1 + (initialNumToRender * 2);
        const windowSize = maxToRenderPerBatch;

        const specificProps = !this._needsScrollView() ? {
            initialNumToRender: initialNumToRender,
            maxToRenderPerBatch: maxToRenderPerBatch,
            windowSize: windowSize
            // updateCellsBatchingPeriod
        } : {};

        return {
            decelerationRate: enableMomentum ? 0.9 : 'fast',
            showsHorizontalScrollIndicator: false,
            showsVerticalScrollIndicator: false,
            overScrollMode: 'never',
            automaticallyAdjustContentInsets: false,
            directionalLockEnabled: true,
            pinchGestureEnabled: false,
            scrollsToTop: false,
            removeClippedSubviews: !this._needsScrollView(),
            inverted: this._needsRTLAdaptations(),
            // renderToHardwareTextureAndroid: true,
            ...specificProps
        };
    }

    _getCustomData (props = this.props) {
        const { data, loopClonesPerSide } = props;
        const dataLength = data && data.length;

        if (!dataLength) {
            return [];
        }

        if (!this._enableLoop()) {
            return data;
        }

        let previousItems = [];
        let nextItems = [];

        if (loopClonesPerSide > dataLength) {
            const dataMultiplier = Math.floor(loopClonesPerSide / dataLength);
            const remainder = loopClonesPerSide % dataLength;

            for (let i = 0; i < dataMultiplier; i++) {
                previousItems.push(...data);
                nextItems.push(...data);
            }

            previousItems.unshift(...data.slice(-remainder));
            nextItems.push(...data.slice(0, remainder));
        } else {
            previousItems = data.slice(-loopClonesPerSide);
            nextItems = data.slice(0, loopClonesPerSide);
        }

        return previousItems.concat(data, nextItems);
    }

    _getComponentStaticProps () {
        const { hideCarousel } = this.state;
        const {
            containerCustomStyle,
            contentContainerCustomStyle,
            keyExtractor,
            sliderWidth,
            sliderHeight,
            style,
            vertical
        } = this.props;

        const containerStyle = [
            containerCustomStyle || style || {},
            hideCarousel ? { opacity: 0 } : {},
            vertical ?
                { height: sliderHeight, flexDirection: 'column' } :
                // LTR hack; see https://github.com/facebook/react-native/issues/11960
                // and https://github.com/facebook/react-native/issues/13100#issuecomment-328986423
                { width: sliderWidth, flexDirection: this._needsRTLAdaptations() ? 'row-reverse' : 'row' }
        ];
        const contentContainerStyle = [
            vertical ? {
                paddingTop: this._getContainerInnerMargin(),
                paddingBottom: this._getContainerInnerMargin(true)
            } : {
                paddingLeft: this._getContainerInnerMargin(),
                paddingRight: this._getContainerInnerMargin(true)
            },
            contentContainerCustomStyle || {}
        ];

        const specificProps = !this._needsScrollView() ? {
            // extraData: this.state,
            renderItem: this._renderItem,
            numColumns: 1,
            getItemLayout: undefined, // see #193
            initialScrollIndex: undefined, // see #193
            keyExtractor: keyExtractor || this._getKeyExtractor
        } : {};

        return {
            ref: c => this._carouselRef = c,
            data: this._getCustomData(),
            style: containerStyle,
            contentContainerStyle: contentContainerStyle,
            horizontal: !vertical,
            scrollEventThrottle: 1,
            onScroll: this._onScrollHandler,
            onScrollBeginDrag: this._onScrollBeginDrag,
            onScrollEndDrag: this._onScrollEndDrag,
            onMomentumScrollEnd: this._onMomentumScrollEnd,
            onResponderRelease: this._onTouchRelease,
            onStartShouldSetResponderCapture: this._onStartShouldSetResponderCapture,
            onTouchStart: this._onTouchStart,
            onTouchEnd: this._onScrollEnd,
            onLayout: this._onLayout,
            ...specificProps
        };
    }

    _getSlideInterpolatedStyle (index, animatedValue) {
        const { layoutCardOffset, slideInterpolatedStyle } = this.props;

        if (slideInterpolatedStyle) {
            return slideInterpolatedStyle(index, animatedValue, this.props);
        } else if (this._shouldUseTinderLayout()) {
            return tinderAnimatedStyles(index, animatedValue, this.props, layoutCardOffset);
        } else if (this._shouldUseStackLayout()) {
            return stackAnimatedStyles(index, animatedValue, this.props, layoutCardOffset);
        } else if (this._shouldUseShiftLayout()) {
            return shiftAnimatedStyles(index, animatedValue, this.props);
        } else {
            return defaultAnimatedStyles(index, animatedValue, this.props);
        }
    }

    _renderItem ({ item, index }) {
        const { interpolators } = this.state;
        const {
            hasParallaxImages,
            itemWidth,
            itemHeight,
            keyExtractor,
            renderItem,
            sliderHeight,
            sliderWidth,
            slideStyle,
            vertical
        } = this.props;

        const animatedValue = interpolators && interpolators[index];

        if (!animatedValue && animatedValue !== 0) {
            return null;
        }

        const animate = this._shouldAnimateSlides();
        const Component = animate ? Animated.View : View;
        const animatedStyle = animate ? this._getSlideInterpolatedStyle(index, animatedValue) : {};

        const parallaxProps = hasParallaxImages ? {
            scrollPosition: this._scrollPos,
            carouselRef: this._carouselRef,
            vertical,
            sliderWidth,
            sliderHeight,
            itemWidth,
            itemHeight
        } : undefined;

        const mainDimension = vertical ? { height: itemHeight } : { width: itemWidth };
        const specificProps = this._needsScrollView() ? {
            key: keyExtractor ? keyExtractor(item, index) : this._getKeyExtractor(item, index)
        } : {};

        return (
            <Component style={[mainDimension, slideStyle, animatedStyle]} pointerEvents={'box-none'} {...specificProps}>
                { renderItem({ item, index }, parallaxProps) }
            </Component>
        );
    }

    render () {
        const { data, renderItem, useScrollView } = this.props;

        if (!data || !renderItem) {
            return null;
        }

        const props = {
            ...this._getComponentOverridableProps(),
            ...this.props,
            ...this._getComponentStaticProps()
        };

        const ScrollViewComponent = AnimatedScrollView;

        return (
            <ScrollViewComponent {...props}>
                {
                    this._getCustomData().map((item, index) => {
                        return this._renderItem({ item, index });
                    })
                }
            </ScrollViewComponent>
        );
    }
}
