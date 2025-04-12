"use client";

import { db, storage } from '../../firebase/config';
import { collection, addDoc } from '../../firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from '../../firebase/storage';
import { v4 as uuidv4 } from 'uuid';

interface EventFormProps {
  onSuccess: () => void;
}

const eventCategories = [
  "Cultural Events",
  "Art and Entertainment Events",
  "Music and Dance Festivals",
  "Festivals and Fairs",
  "Historical and Heritage Events",
  "Tourism Promotion Events",
  "Sports and Adventure Events",
  "Nature and Eco-Tourism Events",
  "Educational and Intellectual Events"
];

export default function EventForm({ onSuccess }: EventFormProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');
  const [images, setImages] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setImages(Array.from(e.target.files));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setUploading(true);
    setError('');

    try {
      // Upload images to Firebase Storage
      const imageUrls = await Promise.all(
        images.map(async (image) => {
          const imageRef = ref(storage, `events/${uuidv4()}_${image.name}`);
          await uploadBytes(imageRef, image);
          return await getDownloadURL(imageRef);
        })
      );

      // Add event to Firestore
      await addDoc(collection(db, 'events'), {
        title,
        description,
        category,
        date,
        location,
        images: imageUrls,
        createdAt: new Date().toISOString(),
      });

      onSuccess();
    } catch (err) {
      setError('Error creating event. Please try again.');
      console.error('Error creating event:', err);
    } finally {
      setUploading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-2xl mx-auto p-8 bg-white rounded-lg shadow-sm">
      <h2 className="text-[#202124] text-2xl font-normal text-center mb-8">Create New Event</h2>
      
      {error && (
        <div className="bg-[#fce8e6] border border-[#d93025] text-[#d93025] px-4 py-3 rounded">
          {error}
        </div>
      )}

      <div className="space-y-6">
        <div>
          <label className="block text-sm text-[#5f6368] mb-1">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 rounded-md border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-[#5f6368] mb-1">Category</label>
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 rounded-md border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors"
          >
            <option value="">Select a category</option>
            {eventCategories.map((cat) => (
              <option key={cat} value={cat}>
                {cat}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm text-[#5f6368] mb-1">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            rows={4}
            className="mt-1 block w-full px-3 py-2 rounded-md border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-[#5f6368] mb-1">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 rounded-md border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-[#5f6368] mb-1">Location</label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            required
            className="mt-1 block w-full px-3 py-2 rounded-md border border-[#dadce0] focus:border-[#1a73e8] focus:ring-1 focus:ring-[#1a73e8] transition-colors"
          />
        </div>

        <div>
          <label className="block text-sm text-[#5f6368] mb-1">Images</label>
          <input
            type="file"
            onChange={handleImageChange}
            multiple
            accept="image/*"
            className="mt-1 block w-full px-3 py-2 text-[#5f6368]"
          />
        </div>
      </div>

      <div className="flex justify-end mt-8">
        <button
          type="submit"
          disabled={uploading}
          className="bg-[#1a73e8] text-white px-6 py-2 rounded-md hover:bg-[#1557b0] focus:outline-none focus:ring-2 focus:ring-[#1a73e8] focus:ring-offset-2 disabled:opacity-50 transition-colors text-sm font-medium"
        >
          {uploading ? 'Creating...' : 'Create Event'}
        </button>
      </div>
    </form>
  );
}