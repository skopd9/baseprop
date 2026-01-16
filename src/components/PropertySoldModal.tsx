import React, { useState } from 'react';
import { XMarkIcon, CurrencyPoundIcon } from '@heroicons/react/24/outline';

interface PropertySoldModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (salesPrice: number) => void;
  propertyAddress: string;
  purchasePrice?: number;
  isSubmitting: boolean;
}

export const PropertySoldModal: React.FC<PropertySoldModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  propertyAddress,
  purchasePrice,
  isSubmitting,
}) => {
  const [salesPrice, setSalesPrice] = useState<number>(purchasePrice || 0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (salesPrice <= 0) {
      setError('Sales price must be greater than 0');
      return;
    }

    onConfirm(salesPrice);
  };

  const profit = purchasePrice ? salesPrice - purchasePrice : null;
  const profitPercentage = purchasePrice && purchasePrice > 0 ? ((profit || 0) / purchasePrice) * 100 : null;

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <div 
        className="relative top-20 mx-auto p-6 border w-full max-w-md shadow-lg rounded-lg bg-white"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <CurrencyPoundIcon className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Mark Property as Sold</h3>
              <p className="text-sm text-gray-500">Enter the final sales price</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md hover:bg-gray-100"
          >
            <XMarkIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-4">
            <strong>Property:</strong> {propertyAddress}
          </p>
          
          {purchasePrice && (
            <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4">
              <p className="text-sm text-blue-800">
                <strong>Purchase Price:</strong> £{purchasePrice.toLocaleString()}
              </p>
            </div>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="salesPrice" className="block text-sm font-medium text-gray-700 mb-1">
              Sales Price (£) *
            </label>
            <input
              type="number"
              id="salesPrice"
              value={salesPrice}
              onChange={(e) => setSalesPrice(parseInt(e.target.value) || 0)}
              min="1"
              step="1000"
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              placeholder="300000"
            />
          </div>

          {profit !== null && (
            <div className={`p-3 rounded-md border ${profit >= 0 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
              <div className="text-sm">
                <p className={`font-medium ${profit >= 0 ? 'text-green-800' : 'text-red-800'}`}>
                  {profit >= 0 ? 'Profit' : 'Loss'}: £{Math.abs(profit).toLocaleString()}
                </p>
                {profitPercentage !== null && (
                  <p className={`text-xs ${profit >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {profit >= 0 ? '+' : ''}{profitPercentage.toFixed(1)}% return
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This will mark the property as sold and it will no longer appear in active property lists.
            </p>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <div className="flex items-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                  Marking as Sold...
                </div>
              ) : (
                'Mark as Sold'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};