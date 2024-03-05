import React, { PureComponent } from 'react';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import VocabStore from '../../services/vocab-store';
import { lookup } from '../../services/lookup';
import Header from '../../../shared/components/Header/Header.jsx';
import Loader from '../../../shared/components/Loader/Loader.jsx';
import HeadWord from '../HeadWord/HeadWord.jsx';
import Definition from '../Definition/Definition.jsx';
import ExportView from '../ExportView/ExportView.jsx';
import Context from '../Context/Context.jsx';
import styles from './Words.css';
import axios from 'axios';


/**
 * In order not to unnecessarily spam the API or potentially risk having any API
 * keys locked, we limit the number of consecutive failures allowed on word
 * lookups. After this many failures, we assume there is something wrong with
 * the user's dictionary or language config.
 */
const MAX_CONSECUTIVE_LOOKUP_FAILURES = 10;

/**
 * Words component
 */
export default class Words extends PureComponent {
  constructor() {
    super();

    this.state = {
      deck: null,
      exportType: null,
      isReversed: false,
      isFetchingExplanations: false,
    };

    this._toggleReverse = () => this.setState({ isReversed: !this.state.isReversed });
  }

  fetchAIExplanations() {
    if (!this.state.deck || this.state.isFetchingExplanations) {
      return;
    }

    this.setState({ isFetchingExplanations: true });

    let pendingRequests = 0;

    this.state.deck.words.forEach((word, index) => {
      if (word.selection && word.context) {
        pendingRequests++;

        axios.post('http://localhost:8000/explain', {
          word: word.selection,
          context: word.context
        })
          .then(response => {
            if (response.data.explanation) {
              this.changeDef(word, response.data.explanation);
            }
          })
          .catch(error => {
            console.error('Error fetching explanation:', error);
          })
          .finally(() => {
            pendingRequests--;
            if (pendingRequests === 0) {
              // Set isFetchingExplanations to false when all requests are completed
              this.setState({ isFetchingExplanations: false });
            }
          });
      }
    });

    if (pendingRequests === 0) {
      this.setState({ isFetchingExplanations: false });
    }
  }

  exportDeck(exportType) {
    this.setState({ exportType });
  }

  changeHeadWord(item, value) {
    VocabStore.updateItem(this.props.id, item, {
      selection: value,
      def: item.def.map(defSubitem => {
        return {
          ...defSubitem,
          // Rewrite def with new selection value.
          text: value,
        };
      })
    });
  }

  changeDef(item, value) {
    VocabStore.updateItem(this.props.id, item, { def: [
      {
        text: item.selection,
        tr: value.split('; ').map(text => ({ text }))
      }
    ] });
  }

  changeContext(item, value) {
    VocabStore.updateItem(this.props.id, item, { context: value });
  }

  removeItem(item) {
    VocabStore.removeItem(this.props.id, item);
  }

  componentWillMount() {
    this.sub = VocabStore.subscribe(() => {
      const deck = VocabStore.getDeck(this.props.id);

      this.setState({ deck });
    });
  }

  componentWillUnmount() {
    this.sub.dispose();
  }

  /**
   * @return {JSX.Element}
   */
  render() {
    const { deck, exportType } = this.state;

    if (!deck) {
      return (
        <div className={ styles.container }>
          <Loader />
        </div>
      );
    }

    if (exportType) {
      return (
        <div className={ styles.container }>
          <div className={ styles.exporting }>
            <ExportView name={ deck.title || deck.language } words={ deck.words } type={ exportType } />
          </div>
        </div>
      );
    }

    const controls = (
      <div className={ styles.controls }>
        <button className={ styles.exportButton } onClick={ () => this.fetchAIExplanations() } disabled={ this.state.isFetchingExplanations }>
          { !this.state.isFetchingExplanations ? 'Fetch AI explanations' : 'Fetching...' }
        </button>

        <div className={ styles.spacer }/>

        <h4>Download the deck as:</h4>

        <button className={ styles.exportButton } onClick={ () => this.exportDeck('basic') }>
          Anki Basic
        </button>

        <button className={ styles.exportButton } onClick={ () => this.exportDeck('cloze') }>
          Anki Cloze
        </button>

        <button className={ styles.exportButton } onClick={ () => this.exportDeck('plain') }>
          Plain CSV
        </button>
      </div>
    );

    const words = deck.words.map((item, index) => {
      return (
        <div className={ styles.entry } key={ index }>
          <div className={ classnames(styles.col, styles.count) }>
            { index + 1 }
          </div>

          <div className={ classnames(styles.col, styles.word) }>
            <HeadWord
              lang={ deck.lang }
              def={ item.def }
              onChange={ val => this.changeHeadWord(item, val) }
            />
          </div>

          <div className={ classnames(styles.col, styles.definition) }>
            <Definition
              def={ item.def }
              onChange={ val => this.changeDef(item, val) }
            />
          </div>

          <div className={ classnames(styles.col, styles.context) }>
            <Context
              selection={ item.selection }
              context={ item.context }
              onChange={ val => this.changeContext(item, val) }
            />
          </div>

          <div className={ classnames(styles.col, styles.remove) }>
            <button className={ styles.button } onClick={ () => this.removeItem(item) }>×</button>
          </div>
        </div>
      );
    });

    return (
      <div>
        <Header title={ deck.title || `${ deck.language }` }>
          <Link to="/vocab">Decks</Link>
          { ' › ' }
        </Header>

        <div className={ styles.container }>
          { controls }

          <div className={ styles.words }>
            <div className={ classnames(styles.entry, styles.header) }>
              <div className={ classnames(styles.col, styles.count) }>
                <button className={ styles.button } onClick={ this._toggleReverse }>⇅</button>
              </div>
              <div className={ styles.col }>Word</div>
              <div className={ styles.col }>Definition</div>
              <div className={ classnames(styles.col, styles.centered, styles.contextHeader) }>Context</div>
            </div>

            { this.state.isReversed ? words.reverse() : words }
          </div>

          <div className={ styles.bottom }>
            { controls }
          </div>
        </div>
      </div>
    );
  }
}
