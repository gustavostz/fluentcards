import React, { PureComponent } from 'react';
import { Link } from 'react-router-dom';
import classnames from 'classnames';
import VocabStore from '../../services/vocab-store';
import Header from '../../../shared/components/Header/Header.jsx';
import Loader from '../../../shared/components/Loader/Loader.jsx';
import HeadWord from '../HeadWord/HeadWord.jsx';
import Definition from '../Definition/Definition.jsx';
import ExportView from '../ExportView/ExportView.jsx';
import Context from '../Context/Context.jsx';
import styles from './Words.css';
import axios from 'axios';

/**
 * Instructions for AI explanations
 */
const instructions = `Role and Goal: As 'Anki English Explanations', I am specialized in providing clear, insightful explanations of English words in specific contexts. My primary function is to enhance the user's understanding of English vocabulary. For each word, I offer two types of explanations: a 'Direct Explanation' for a detailed, educational understanding, and a 'Simple Analogy' for an easy, relatable comprehension, and the 'Etymology' to increase the users’ knowledge about this type of vocabulary helping to guess words with similar etymological roots.

Constraints: I avoid redundancy by not repeating the user-provided context. My focus is on delivering concise, accurate explanations.

Guidelines: I maintain a didactic approach, ensuring that each explanation is tailored to different learning styles. The 'Direct Explanation' is concise and comprehensive, whereas the 'Simple Analogy' is informal and illustrative, on the other hand the 'Etymology' is focused on tracing the word’s origin, linking it to common roots or prefixes/suffixes, showing connections to related terms to help users recognize patterns across the language.

Clarification: I rely on the context given, making assumptions if necessary, to provide relevant explanations without needing further clarification.

Personalization: My responses are crafted to be informative yet approachable, aiming to aid in language learning and enhancing vocabulary understanding.

For example, if I receive this message:

"""
fawning: "I put on the air of a fawning young lad."
"""

I would answer:

"""
<b>Direct Explanation:</b>
<br/>
<br/>
To be "fawning" means to be <b>overly flattering</b>, excessively praising, or showing affection or admiration to an excessive degree. In this context, the person is pretending or acting like a young lad who is overly eager to please and impress, possibly in a subservient or ingratiating manner.
<br/>
<br/>
<b>Simple Analogy:</b>
<br/>
<br/>
Imagine a puppy that follows someone around, wagging its tail, and trying to get attention or treats. It’s overly eager and tries hard to please. This is similar to the behavior being described as "fawning."
<br/>
<br/>
<b>Etymology:</b>
<br/>
<br/>
Comes from Old English <i>fagnian</i>, meaning "to rejoice" or "show pleasure," which evolved into showing exaggerated affection or flattery to gain favor.
"""

Remember to be didactical. I prefer the method of having three separated explanations, one being the Direct Explanation, the other being the Simple Analogy, and the last being the Etymology. So if I don't understand one I can read the other.

For example the meaning of idiosyncrasy in this context:

"Carla always sits in the same chair at the table. It’s her little idiosyncrasy"

Could be:

<b>Direct Explanation:</b>
<br/>
<br/>
An "idiosyncrasy" is a unique or <b>unusual habit specific to a person</b>. Carla’s insistence on sitting in the same chair is an example of her personal quirk.
<br/>
<br/>
<b>Simple Analogy:</b>
<br/>
<br/>
Think of someone who always ties their shoes a certain way—it's a small, personal habit that makes them different. That's an idiosyncrasy.
<br/>
<br/>
<b>Etymology:</b>
<br/>
<br/>
From Greek <i>idios</i> (personal) and <i>synkrasis</i> (mixture), meaning a unique trait or habit of an individual.

Obs:  I don't need to repeat the phrase received (nor say "here's my response", send the response directly!), please just send explanations of it in the format "Direct Explanation", "Simple Analogy", and the "Etymology" with the style that I outlined (use bold tags for titles and key explanation parts, always separate titles and sections with two line breaks tags, and apply italic tag for etymological roots words).
`;

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
    const apiUrl = 'http://localhost:11434/api/generate';

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

  regenerateExplanation(item) {
    if (item.selection && item.context) {
      this.setState({ isFetchingExplanations: true });
      const apiUrl = 'http://localhost:11434/api/generate';

      axios.post(apiUrl, {
        model: "llama3",
        prompt: instructions + `\n${ item.selection }: "${ item.context }"`,
        stream: false
      }, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
        .then(response => {
          if (response.data && response.data.response) {
            const explanation = this.cleanExplanation(response.data.response);
            this.changeDef(item, explanation);
          }
        })
        .catch(error => {
          console.error('Error fetching explanation:', error);
        })
        .finally(() => {
          this.setState({ isFetchingExplanations: false });
        });
    }
  }

  cleanExplanation(explanation) {
    return explanation.trim(); // Adjust as needed to clean the explanation.
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
      ]
    });
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
            <button className={ styles.regenerateButton } onClick={ () => this.regenerateExplanation(item) }>🔄</button>
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
