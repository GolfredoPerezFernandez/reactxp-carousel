# reactxp-carousel [![npm version](https://img.shields.io/npm/v/reactxp-map.svg?style=flat)](https://www.npmjs.com/package/reactxp-carousel)
[ReactXP](https://microsoft.github.io/reactxp/) Carousel Plugin with support for Web, Android and iOS based on [react-native-snap-carousel](https://github.com/archriss/react-native-snap-carousel)

## Documentation

### Prerequisites
* [ReactXP](https://github.com/microsoft/reactxp/)
* [react-native-snap-carousel](https://github.com/archriss/react-native-snap-carousel)

### Samples
* [Example](https://github.com/Luxbit/reactxp-map/tree/master/samples/example)

### Usage
```javascript
import Carousel from 'reactxp-carousel';

export class MyCarousel extends Component {

    _renderItem ({item, index}) {
        return (
            <View style={styles.slide}>
                <Text style={styles.title}>{ item.title }</Text>
            </View>
        );
    }

    render () {
        return (
            <Carousel
              ref={(c) => this._carousel = c}
              data={this.state.entries}
              renderItem={this._renderItem}
              sliderWidth={sliderWidth}
              itemWidth={itemWidth}
            />
        );
    }
}
```

## License
This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details
