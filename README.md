
# Fluentcards AI

![Generating explanations for the flashcards using AI locally](./assets/generating-explanations-using-AI-Locally.gif)

Collect flashcards from your Kindle and generate AI-powered explanations for Anki. This project is a fork of the original [Fluentcards](https://github.com/katspaugh/fluentcards) by [katspaugh](https://github.com/katspaugh). A huge thank you to the original project for providing a solid foundation for this AI-enhanced version!

## How It Works

The Vocabulary Builder on Kindle devices is a powerful feature for language learners. It collects all the words you look up, including their definition and context. This project takes your Kindle vocabulary and uses an AI language model (LLM) to generate detailed explanations based on the word and its context. These explanations are then ready to be imported into Anki for spaced repetition learning.

### Key Features

- 📚 Collect vocabulary from your Kindle device.
- 🧠 Generate AI-powered explanations for each word based on its context.
- 📝 Export the vocabulary and explanations in a format ready for Anki.
- 🔧 Runs locally to ensure privacy and security.

### How to Use

1. **Collecting Words on Your Vocabulary List:**
   - Ensure your Kindle device is set up with the correct dictionary for the language you're learning.
   - Look up words while reading on your Kindle to add them to your vocabulary list.

2. **Exporting Your Vocabulary File:**
   - Connect your Kindle to your computer and locate the `vocab.db` file.
   - Copy the `vocab.db` file to your computer.

3. **Running the AI Explanations Generator:**
   - Ensure you have Python 3.8+ installed.
   - Install the required dependencies for the backend.
   - Start the FastAPI server to run the LLM locally.
   - If your system does not have a powerful GPU, you can modify the code to run the LLM using only the CPU.

4. **Running the Frontend:**
   - Ensure you have Node.js and npm or Yarn installed.
   - Install the dependencies and start the React app.
   - Upload your `vocab.db` file and fetch AI-generated explanations.

5. **Exporting for Anki:**
   - Once the explanations are fetched, you can export the deck in Anki format.
   - Import the deck into Anki, ensuring that "Allow HTML in fields" is ticked.

### Installation and Setup

#### Backend (FastAPI):

```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload
```

#### Frontend (React):

```bash
cd frontend
npm install
npm start
# or
yarn install
yarn start
```

### Credits

This project is a fork of [Fluentcards](https://github.com/katspaugh/fluentcards) by [katspaugh](https://github.com/katspaugh). The AI integration and modifications to the original project were made to enhance the learning experience by providing more contextually relevant explanations.
