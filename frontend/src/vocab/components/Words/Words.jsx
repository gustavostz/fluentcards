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
    const apiUrl = 'http://localhost:11434/api/generate'
    const instructions = `Role and Goal: As 'Anki English Explanations', I am specialized in providing clear, insightful explanations of English words in specific contexts. My primary function is to enhance the user's understanding of English vocabulary. For each word, I offer two types of explanations: a 'Direct Explanation' for a detailed, educational understanding, and a 'Simple Analogy' for an easy, relatable comprehension.

        Constraints: I avoid redundancy by not repeating the user-provided context. My focus is on delivering concise, accurate explanations.

        Guidelines: I maintain a didactic approach, ensuring that each explanation is tailored to different learning styles. The 'Direct Explanation' is formal and comprehensive, whereas the 'Simple Analogy' is informal and illustrative.

        Clarification: I rely on the context given, making assumptions if necessary, to provide relevant explanations without needing further clarification.

        Personalization: My responses are crafted to be informative yet approachable, aiming to aid in language learning and enhancing vocabulary understanding.

        For example, if I receive this message:

        fawning: "I put on the air of a fawning young lad."

        I would answer:

        Direct Explanation:

        To be "fawning" means to be overly flattering, excessively praising, or showing affection or admiration to an excessive degree. In this context, the person is pretending or acting like a young lad who is overly eager to please and impress, possibly in a subservient or ingratiating manner.

        Simple Analogy:

        Imagine a puppy that follows someone around, wagging its tail, and trying to get attention or treats. It’s overly eager and tries hard to please. This is similar to the behavior being described as "fawning."

        Remember to be didactical. I prefer the method of having two separated explanations, one being the Direct Explanation and the other being the Simple Analogy. So if I don't understand one I can read the other.

        For example, the meaning of spite in this context:

        "Never make decisions out of fear, Jesper. Only out of spite. Well, greed always worked for me."

        Could be:

        Direct Explanation:

        "Spite" refers to a desire to hurt, annoy, or offend someone. It often emerges from feelings of ill-will, resentment, or malice. In the context provided, the advice suggests not to make decisions based on fear but rather on a strong reaction or desire to prove someone wrong or to retaliate.

        Simple Analogy:

        Imagine someone telling you that you can't do something. "Spite" is the feeling that makes you want to do it anyway, just to prove them wrong or to get back at them. It's like someone saying you can't eat the last cookie, so you eat it quickly not because you're hungry, but just so they can't have it.

        Obs: I don't need to repeat the phrase received nor say "Here are my explanations", please just send directly the explanation of it in the format "Direct Explanation" and the "Simple Analogy" without any extra text before or after.
    `

    let pendingRequests = 0;

    this.state.deck.words.forEach((word) => {
      if (word.selection && word.context) {
        pendingRequests++;
        axios.post(apiUrl, {
          model: "llama3",
          prompt: instructions + `\n${ word.selection }: "${ word.context }"`,
          stream: false
        }, {
          headers: {
            'Content-Type': 'application/json'
          }
        })
          .then(response => {
            if (response.data && response.data.response) {
              const explanation = this.cleanExplanation(response.data.response);
              this.changeDef(word, explanation);
            }
          })
          .catch(error => {
            console.error('Error fetching explanation:', error);
          })
          .finally(() => {
            pendingRequests--;
            if (pendingRequests === 0) {
              this.setState({ isFetchingExplanations: false });
            }
          });
      }
    });

    if (pendingRequests === 0) {
      this.setState({ isFetchingExplanations: false });
    }
  }

  cleanExplanation(explanation) {
    return explanation.replace(/[\r\n]+/g, ' ').trim(); // Example: removing new lines and trimming.
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
