const path = require('path')
const webpack = require('webpack')

//const VueLoaderPlugin = require('vue-loader/lib/plugin')

module.exports = {
  mode: 'development',
  entry: {
    main: './src/web/ts/pages/main.ts',
    'all-cables': './src/web/ts/pages/all-cables.ts',
    'base': './src/web/ts/pages/base.ts',
    'cabletype': './src/web/ts/pages/cabletype.ts',
    'cabletypemgmt': './src/web/ts/pages/cabletypemgmt.ts',
    'manage-cables': './src/web/ts/pages/manage-cables.ts',
    'manage-requests': './src/web/ts/pages/manage-requests.ts',
    'manager': './src/web/ts/pages/manager.ts',
    'request': './src/web/ts/pages/request.ts',
    'wbs': './src/web/ts/pages/wbs.ts'
    // slot: './src/web/ts/slot-action.ts',
    // device: './src/web/ts/device-action.ts',
    // group: './src/web/ts/slot-group-action.ts',
    // machmodes: './src/web/ts/machmodes.ts',
  },
  output: {
    path: path.resolve(__dirname, '../../public/dist'),
    //publicPath: '/dist/',
    //filename: 'build.js'
  },
  module: {
    rules: [
      {
        test: /\.ts$/,
        enforce: 'pre',
        loader: 'tslint-loader',
        options: {
          /* Loader options go here */
          configFile: 'tslint.json',
          emitErrors: false,
          failOnHint: false,
        },
      },
    //   {
    //     test: /\.vue$/,
    //     loader: 'vue-loader',
    //     options: {
    //       loaders: {
    //         // Since sass-loader (weirdly) has SCSS as its default parse mode, we map
    //         // the "scss" and "sass" values for the lang attribute to the right configs here.
    //         // other preprocessors should work out of the box, no loader config like this necessary.
    //         'scss': 'vue-style-loader!css-loader!sass-loader',
    //         'sass': 'vue-style-loader!css-loader!sass-loader?indentedSyntax',
    //       }
    //       // other vue-loader options go here
    //     }
    //   },
      {
        test: /\.tsx?$/,
        loader: 'ts-loader',
        exclude: /node_modules/,
        // options: {
        //   appendTsSuffixTo: [/\.vue$/],
        // }
      },
      {
        test: /\.(png|jpg|gif|svg|ttf|oft|eot|woff(2)?)(\?[a-z0-9]+)?$/,
        loader: 'file-loader',
        options: {
          name: '[name].[ext]?[hash]'
        }
      },
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      }
    ]
  },
  plugins: [
    new webpack.ProvidePlugin({
      'jQuery': 'jquery', // required to support jquery-jeditable
    }),
    // initialize the vue-loader
    //new VueLoaderPlugin(),
  ],
  resolve: {
    extensions: ['.ts', '.js', '.vue', '.json'],
    // alias: {
    //   'vue$': 'vue/dist/vue.esm.js'
    // }
  },
  devServer: {
    historyApiFallback: true,
    noInfo: true
  },
  performance: {
    hints: false
  },
  devtool: '#eval-source-map'
}

if (process.env.NODE_ENV === 'production') {
  module.exports.mode = 'production';
  module.exports.devtool = 'source-map';
}
